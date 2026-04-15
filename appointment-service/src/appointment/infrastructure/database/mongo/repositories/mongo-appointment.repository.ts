import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Appointment,
  AppointmentDocument,
} from '../schemas/appointment.schema';
import { Appointment as AppointmentEntity } from '../../../../../domain/entities/appointment.entity';
import {
  IAppointmentRepository,
  APPOINTMENT_REPOSITORY,
} from '../../../../../domain/repositories/appointment.repository.interface';
import { AppointmentStatus } from '../../../../../domain/enums/appointment-status.enum';
import { AppointmentTimeFilter } from '../../../../../domain/enums/appointment-time-filter.enum';
import {
  SLOT_DURATION_MINUTES,
  SLOT_BLOCKING_STATUSES,
} from '../../../../../domain/constants/appointment.constants';

// Re-export the token so appointment.module.ts can import from one place
export { APPOINTMENT_REPOSITORY };

/**
 * MongoAppointmentRepository
 *
 * The concrete Infrastructure implementation of IAppointmentRepository.
 * All Mongoose/MongoDB-specific logic is isolated here — nothing above this
 * layer (Application, Domain) knows that MongoDB exists.
 *
 * Key responsibilities:
 *  - Translating Mongoose documents → domain entities via _toEntity()
 *  - Building time-range queries for the AppointmentTimeFilter enum
 *  - Performing slot conflict lookups (filtered by SLOT_BLOCKING_STATUSES)
 *  - All error propagation is left to NestJS defaults (letting exceptions bubble)
 */
@Injectable()
export class MongoAppointmentRepository implements IAppointmentRepository {
  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  /**
   * Creates and persists a new Appointment document.
   * Omits `id` from the input because MongoDB generates _id automatically.
   */
  async create(
    appointment: Omit<AppointmentEntity, 'id'>,
  ): Promise<AppointmentEntity> {
    const doc = await this.appointmentModel.create(appointment);
    return this._toEntity(doc);
  }

  /**
   * Partially updates an Appointment by ID.
   * Uses $set to avoid overwriting fields not included in `partial`.
   */
  async update(
    id: string,
    partial: Partial<AppointmentEntity>,
  ): Promise<AppointmentEntity | null> {
    const doc = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: partial }, { new: true })
      .exec();
    return doc ? this._toEntity(doc) : null;
  }

  /**
   * Updates the status of an appointment and optionally sets a telemedicine link.
   * Designed for the doctor accept/reject flow — a single atomic DB operation.
   */
  async updateStatus(
    id: string,
    status: AppointmentStatus,
    telemedicineLink?: string,
  ): Promise<AppointmentEntity | null> {
    // Build the update payload — only include telemedicineLink if it was provided
    const updatePayload: Partial<AppointmentEntity> = { status };
    if (telemedicineLink) {
      updatePayload.telemedicineLink = telemedicineLink;
    }

    const doc = await this.appointmentModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .exec();
    return doc ? this._toEntity(doc) : null;
  }

  // -------------------------------------------------------------------------
  // Read — Single
  // -------------------------------------------------------------------------

  /**
   * Finds a single appointment by its MongoDB ObjectId (as string).
   * Returns null instead of throwing if the document does not exist.
   */
  async findById(id: string): Promise<AppointmentEntity | null> {
    const doc = await this.appointmentModel.findById(id).exec();
    return doc ? this._toEntity(doc) : null;
  }

  // -------------------------------------------------------------------------
  // Read — Collections
  // -------------------------------------------------------------------------

  /** Fetches all appointments in the system (Admin use only). */
  async findAll(): Promise<AppointmentEntity[]> {
    const docs = await this.appointmentModel
      .find()
      .sort({ slotStart: 1 })
      .exec();
    return docs.map((doc) => this._toEntity(doc));
  }

  /**
   * Fetches appointments for a patient, with optional temporal filtering.
   * Results are always sorted by slotStart ascending (chronological).
   */
  async findByPatientId(
    patientId: string,
    timeFilter?: AppointmentTimeFilter,
  ): Promise<AppointmentEntity[]> {
    const query = {
      patientId,
      ...this._buildTimeFilterQuery(timeFilter),
    };
    const docs = await this.appointmentModel
      .find(query)
      .sort({ slotStart: 1 })
      .exec();
    return docs.map((doc) => this._toEntity(doc));
  }

  /**
   * Fetches appointments for a doctor, with optional temporal filtering.
   * Results are always sorted by slotStart ascending (chronological).
   */
  async findByDoctorId(
    doctorId: string,
    timeFilter?: AppointmentTimeFilter,
  ): Promise<AppointmentEntity[]> {
    const query = {
      doctorId,
      ...this._buildTimeFilterQuery(timeFilter),
    };
    const docs = await this.appointmentModel
      .find(query)
      .sort({ slotStart: 1 })
      .exec();
    return docs.map((doc) => this._toEntity(doc));
  }

  // -------------------------------------------------------------------------
  // Slot Conflict Checks
  // -------------------------------------------------------------------------

  /**
   * Returns true if the doctor already has a PENDING or CONFIRMED appointment
   * at the exact same slot start time. Used before creating a new appointment.
   */
  async hasSlotConflictForDoctor(
    doctorId: string,
    slotStart: Date,
  ): Promise<boolean> {
    const conflict = await this.appointmentModel
      .findOne({
        doctorId,
        slotStart,
        // Only blocking statuses occupy the slot — CANCELLED/REJECTED free it up
        status: { $in: SLOT_BLOCKING_STATUSES },
      })
      .exec();
    return conflict !== null;
  }

  /**
   * Returns true if the patient already has a PENDING or CONFIRMED appointment
   * at the exact same slot start time. Prevents double-booking for the patient.
   */
  async hasSlotConflictForPatient(
    patientId: string,
    slotStart: Date,
  ): Promise<boolean> {
    const conflict = await this.appointmentModel
      .findOne({
        patientId,
        slotStart,
        status: { $in: SLOT_BLOCKING_STATUSES },
      })
      .exec();
    return conflict !== null;
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Builds a Mongoose query fragment for temporal filtering.
   *
   * Boundary logic (using SLOT_DURATION_MINUTES = 30):
   *
   *   PAST     → slotStart + 30min <= now  →  { slotStart: { $lte: now - 30min } }
   *   CURRENT  → slotStart <= now AND
   *               slotStart > now - 30min   →  { slotStart: { $lte: now, $gt: now - 30min } }
   *   UPCOMING → slotStart > now            →  { slotStart: { $gt: now } }
   *   undefined → no filter (return all)
   */
  private _buildTimeFilterQuery(
    timeFilter?: AppointmentTimeFilter,
  ): Record<string, unknown> {
    if (!timeFilter) return {};

    const now = new Date();
    const slotDurationMs = SLOT_DURATION_MINUTES * 60 * 1000;
    const slotDurationAgo = new Date(now.getTime() - slotDurationMs);

    switch (timeFilter) {
      case AppointmentTimeFilter.PAST:
        // The slot has fully elapsed — slotStart is more than 30 min in the past
        return { slotStart: { $lte: slotDurationAgo } };

      case AppointmentTimeFilter.CURRENT:
        // The appointment slot is currently in progress
        return { slotStart: { $lte: now, $gt: slotDurationAgo } };

      case AppointmentTimeFilter.UPCOMING:
        // The slot has not yet started
        return { slotStart: { $gt: now } };

      default:
        return {};
    }
  }

  /**
   * Maps a raw Mongoose AppointmentDocument to a clean domain Appointment entity.
   *
   * This is the critical anti-corruption layer between Infrastructure and Domain.
   * The service and above layers receive only plain domain objects — never
   * Mongoose documents with their save(), populate(), and __v baggage.
   */
  private _toEntity(doc: AppointmentDocument): AppointmentEntity {
    const entity = new AppointmentEntity();
    // MongoDB stores _id as an ObjectId; toString() gives us the hex string
    entity.id = (doc._id as Types.ObjectId).toString();
    entity.patientId = doc.patientId;
    entity.doctorId = doc.doctorId;
    entity.slotStart = doc.slotStart;
    entity.status = doc.status;
    entity.reasonForVisit = doc.reasonForVisit;
    entity.telemedicineLink = doc.telemedicineLink ?? undefined;
    entity.paymentStatus = doc.paymentStatus;
    return entity;
  }
}
