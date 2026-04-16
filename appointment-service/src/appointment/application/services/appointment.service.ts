import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { AppointmentTimeFilter } from '../../domain/enums/appointment-time-filter.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';
import { TelemedicineClient } from '../../infrastructure/external/telemedicine.client';
import { PaymentClient } from '../../infrastructure/external/payment.client';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { CreateAppointmentDto } from '../dtos/create-appointment.dto';
import { UpdateAppointmentStatusDto } from '../dtos/update-appointment-status.dto';
import { UpdateAppointmentDto } from '../dtos/update-appointment.dto';

/**
 * AppointmentService — Application Service
 *
 * Orchestrates all business logic for the Appointment bounded context.
 * This layer enforces business rules, authorization checks, and coordinates
 * between the domain repository and external infrastructure clients.
 *
 * Strict layer boundaries:
 *   - Talks to: IAppointmentRepository (domain contract), TelemedicineClient,
 *               PaymentClient (infrastructure adapters)
 *   - Does NOT: touch Mongoose, Express, or any HTTP-specific concerns
 *   - Auth:     Guard (presentation) handles authentication — this service
 *               handles AUTHORIZATION (ownership and role checks)
 */
@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    // Injected via the APPOINTMENT_REPOSITORY token — decoupled from Mongo impl
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,

    private readonly telemedicineClient: TelemedicineClient,
    private readonly paymentClient: PaymentClient,
    private readonly doctorClient: DoctorClient,
  ) {}

  // -------------------------------------------------------------------------
  // Book Appointment (Patient only)
  // -------------------------------------------------------------------------

  /**
   * Books a new appointment for an authenticated patient.
   *
   * Business rules enforced:
   *  1. Only PATIENT role can book.
   *  2. slotStart must be a future time aligned to :00 or :30 (30-min slots).
   *  3. No other PENDING/CONFIRMED appointment for the same doctor at this slot.
   *  4. No other PENDING/CONFIRMED appointment for this patient at this slot.
   *  5. Payment confirmation is attempted non-blocking (fails safe to 'PENDING').
   */
  async bookAppointment(
    dto: CreateAppointmentDto,
    patientId: string,
    role: UserRole,
  ): Promise<Appointment> {
    // --- Authorization ---
    if (role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can book appointments.');
    }

    // --- Slot Validation (local format check) ---
    const slotStart = new Date(dto.slotStart);
    this._validateSlotDate(slotStart);

    // --- Doctor Availability Validation (Doctor Service) ---
    // Verifies the slot falls within the doctor's configured working hours,
    // respecting breaks and date overrides. This is separate from conflict
    // detection — the Doctor Service does not know about existing bookings.
    const slotValidation = await this.doctorClient.validateSlot(
      dto.doctorId,
      slotStart,
    );
    if (!slotValidation.valid) {
      throw new BadRequestException(
        `This time slot is not available: ${
          slotValidation.reason ?? 'outside doctor availability.'
        }`,
      );
    }

    // --- Conflict Detection — own DB (parallel queries for performance) ---
    const [doctorConflict, patientConflict] = await Promise.all([
      this.appointmentRepository.hasSlotConflictForDoctor(dto.doctorId, slotStart),
      this.appointmentRepository.hasSlotConflictForPatient(patientId, slotStart),
    ]);

    if (doctorConflict) {
      throw new ConflictException(
        `Doctor ${dto.doctorId} already has a booking in this time slot. Please choose a different slot.`,
      );
    }
    if (patientConflict) {
      throw new ConflictException(
        'You already have an appointment in this time slot. Please choose a different slot.',
      );
    }

    // --- Persist ---
    const newAppointment = await this.appointmentRepository.create({
      patientId,
      doctorId: dto.doctorId,
      slotStart,
      status: AppointmentStatus.PENDING,
      reasonForVisit: dto.reasonForVisit,
      telemedicineLink: undefined,
      paymentStatus: 'PENDING',
    });

    // --- Payment Confirmation (non-blocking) ---
    // The Payment Service may not exist yet — errors default paymentStatus to 'PENDING'.
    try {
      const paymentStatus = await this.paymentClient.confirmPayment(newAppointment.id);
      if (paymentStatus !== 'PENDING') {
        // Only write back if we received a meaningful non-default response
        await this.appointmentRepository.update(newAppointment.id, { paymentStatus });
        newAppointment.paymentStatus = paymentStatus;
      }
    } catch {
      // PaymentClient already logs this. Safe to swallow here.
      this.logger.warn(
        `Payment confirmation silently failed for appointment ${newAppointment.id}. Status remains PENDING.`,
      );
    }

    // TODO [Notification Service]: Publish an 'appointment.booked' event to RabbitMQ/Kafka.
    // This should trigger an email/SMS confirmation to both the patient and doctor.
    // Example: await this.eventEmitter.emit('appointment.booked', { appointmentId: newAppointment.id, patientId, doctorId: dto.doctorId });

    this.logger.log(
      `Appointment ${newAppointment.id} booked — patient: ${patientId}, doctor: ${dto.doctorId}, slot: ${slotStart.toISOString()}`,
    );
    return newAppointment;
  }

  // -------------------------------------------------------------------------
  // Get Appointments (All roles — scoped by role)
  // -------------------------------------------------------------------------

  /**
   * Returns appointments scoped to the caller's role and an optional time filter.
   *
   *   ADMIN   → all appointments (timeFilter ignored for admin)
   *   PATIENT → their own appointments only
   *   DOCTOR  → appointments assigned to them only
   */
  async getAppointments(
    userId: string,
    role: UserRole,
    timeFilter?: AppointmentTimeFilter,
  ): Promise<Appointment[]> {
    switch (role) {
      case UserRole.ADMIN:
        return this.appointmentRepository.findAll();

      case UserRole.PATIENT:
        return this.appointmentRepository.findByPatientId(userId, timeFilter);

      case UserRole.DOCTOR:
        return this.appointmentRepository.findByDoctorId(userId, timeFilter);

      default:
        throw new ForbiddenException('Unknown role — cannot retrieve appointments.');
    }
  }

  // -------------------------------------------------------------------------
  // Get Appointment By ID (All roles — ownership enforced)
  // -------------------------------------------------------------------------

  /**
   * Returns a single appointment, enforcing ownership:
   *   PATIENT → can only view their own appointments.
   *   DOCTOR  → can only view appointments assigned to them.
   *   ADMIN   → can view any appointment.
   */
  async getAppointmentById(
    id: string,
    userId: string,
    role: UserRole,
  ): Promise<Appointment> {
    const appointment = await this._findOrThrow(id);

    if (role === UserRole.PATIENT && appointment.patientId !== userId) {
      throw new ForbiddenException('You do not have access to this appointment.');
    }
    if (role === UserRole.DOCTOR && appointment.doctorId !== userId) {
      throw new ForbiddenException('This appointment is not assigned to you.');
    }

    return appointment;
  }

  // -------------------------------------------------------------------------
  // Update Status: Accept / Reject (Doctor only)
  // -------------------------------------------------------------------------

  /**
   * Allows a doctor to accept (CONFIRMED) or reject (REJECTED) a PENDING appointment.
   *
   * Business rules:
   *  1. Caller must be DOCTOR.
   *  2. The appointment's doctorId must match the authenticated userId.
   *  3. Appointment must currently be PENDING (no transitions from other states).
   *  4. On CONFIRMED: calls TelemedicineClient to generate a session URL.
   */
  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    userId: string,
    role: UserRole,
  ): Promise<Appointment> {
    // --- Authorization ---
    if (role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Only doctors can accept or reject appointments.');
    }

    const appointment = await this._findOrThrow(id);

    // --- Ownership ---
    if (appointment.doctorId !== userId) {
      throw new ForbiddenException('This appointment is not assigned to you.');
    }

    // --- Business Rule: only PENDING → CONFIRMED/REJECTED ---
    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update status of an appointment that is '${appointment.status}'. ` +
          `Only PENDING appointments can be accepted or rejected.`,
      );
    }

    // --- Doctor can only set CONFIRMED or REJECTED ---
    if (
      dto.status !== AppointmentStatus.CONFIRMED &&
      dto.status !== AppointmentStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Doctors can only set status to CONFIRMED or REJECTED. Received: '${dto.status}'.`,
      );
    }

    // --- Telemedicine Link (generated on CONFIRMED only) ---
    let telemedicineLink: string | undefined;
    if (dto.status === AppointmentStatus.CONFIRMED) {
      telemedicineLink = await this.telemedicineClient.generateLink(appointment.id);
      this.logger.log(
        `Telemedicine link generated for appointment ${id}: ${telemedicineLink}`,
      );
    }

    // --- Persist ---
    const updated = await this.appointmentRepository.updateStatus(
      id,
      dto.status,
      telemedicineLink,
    );
    if (!updated) {
      throw new NotFoundException(`Appointment ${id} could not be updated.`);
    }

    // TODO [Notification Service]: Publish 'appointment.confirmed' or 'appointment.rejected' event.
    // On CONFIRMED, include the telemedicineLink in the notification payload so the patient
    // receives the video session URL in their email/SMS.
    // Example: await this.eventEmitter.emit('appointment.status_changed', { appointmentId: id, status: dto.status, telemedicineLink });

    this.logger.log(
      `Appointment ${id} status → ${dto.status} by doctor ${userId}.`,
    );
    return updated;
  }

  // -------------------------------------------------------------------------
  // Update Appointment: Modify / Cancel (Patient only)
  // -------------------------------------------------------------------------

  /**
   * Allows a patient to modify details or cancel their appointment.
   *
   * Business rules:
   *  1. Caller must be PATIENT.
   *  2. patientId must match the authenticated userId.
   *  3. COMPLETED and REJECTED appointments cannot be modified.
   *  4. If rescheduling (new slotStart): slot conflicts are re-checked,
   *     and status resets to PENDING (doctor must re-confirm the new time).
   *  5. If cancelling (status = CANCELLED): any non-terminal status is allowed.
   *  6. At least one field must be provided.
   */
  async updateAppointment(
    id: string,
    dto: UpdateAppointmentDto,
    userId: string,
    role: UserRole,
  ): Promise<Appointment> {
    // --- Authorization ---
    if (role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can modify appointment details.');
    }

    const appointment = await this._findOrThrow(id);

    // --- Ownership ---
    if (appointment.patientId !== userId) {
      throw new ForbiddenException('You do not have access to this appointment.');
    }

    // --- Guard: cannot touch terminal-state appointments ---
    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot modify an appointment with status '${appointment.status}'.`,
      );
    }

    // --- Build partial update payload ---
    const partial: Partial<Appointment> = {};

    // Handle explicit cancellation
    if (dto.status === AppointmentStatus.CANCELLED) {
      partial.status = AppointmentStatus.CANCELLED;

      // TODO [Notification Service]: Publish 'appointment.cancelled' event.
      // Both the patient and the assigned doctor should receive a cancellation notification.
      // Example: await this.eventEmitter.emit('appointment.cancelled', { appointmentId: id, patientId: userId, doctorId: appointment.doctorId });
    }

    // Allow updating the reason for visit
    if (dto.reasonForVisit) {
      partial.reasonForVisit = dto.reasonForVisit;
    }

    // Handle rescheduling (slotStart change)
    if (dto.slotStart) {
      const newSlotStart = new Date(dto.slotStart);
      this._validateSlotDate(newSlotStart);

      // Re-validate new slot against the doctor's schedule
      const slotValidation = await this.doctorClient.validateSlot(
        appointment.doctorId,
        newSlotStart,
      );
      if (!slotValidation.valid) {
        throw new BadRequestException(
          `The new time slot is not available: ${
            slotValidation.reason ?? 'outside doctor availability.'
          }`,
        );
      }

      // Re-check own DB conflicts for the new slot
      const [doctorConflict, patientConflict] = await Promise.all([
        this.appointmentRepository.hasSlotConflictForDoctor(
          appointment.doctorId,
          newSlotStart,
        ),
        this.appointmentRepository.hasSlotConflictForPatient(userId, newSlotStart),
      ]);

      if (doctorConflict) {
        throw new ConflictException(
          `Doctor ${appointment.doctorId} already has a booking in the new time slot.`,
        );
      }
      if (patientConflict) {
        throw new ConflictException(
          'You already have an appointment in the new time slot.',
        );
      }

      partial.slotStart = newSlotStart;

      // Rescheduling resets status — the doctor must re-confirm the new slot
      partial.status = AppointmentStatus.PENDING;

      // Clear telemedicine link if the slot changes (old link is now invalid)
      partial.telemedicineLink = undefined;
    }

    // Validate at least one field was provided
    if (Object.keys(partial).length === 0) {
      throw new BadRequestException(
        'No valid fields provided for update. Supply at least one of: status, reasonForVisit, slotStart.',
      );
    }

    const updated = await this.appointmentRepository.update(id, partial);
    if (!updated) {
      throw new NotFoundException(`Appointment ${id} could not be updated.`);
    }

    this.logger.log(
      `Appointment ${id} updated by patient ${userId}. Changes: ${JSON.stringify(partial)}`,
    );
    return updated;
  }

  // -------------------------------------------------------------------------
  // Available Slots Proxy (proxies to Doctor Service)
  // -------------------------------------------------------------------------

  /**
   * Returns free slot start times for a doctor within a date range.
   *
   * Proxies the request to the Doctor Service's integration endpoint so the
   * frontend never needs to know the Doctor Service exists (distribution transparency).
   * Returns [] if the Doctor Service is unavailable or the doctor has no schedule.
   *
   * @param doctorId - The doctor's auth user ID.
   * @param from     - ISO 8601 string for the start of the query window.
   * @param to       - ISO 8601 string for the end of the query window.
   */
  async getAvailableSlots(
    doctorId: string,
    from: string,
    to: string,
  ): Promise<string[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'Query params "from" and "to" must be valid ISO 8601 date-time strings.',
      );
    }
    if (fromDate >= toDate) {
      throw new BadRequestException('"from" must be earlier than "to".');
    }

    return this.doctorClient.getFreeSlots(doctorId, fromDate, toDate);
  }

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /**
   * Retrieves an appointment or throws a NotFoundException.
   * Used by all read/update operations to centralise the existence check.
   */
  private async _findOrThrow(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found.`);
    }
    return appointment;
  }

  /**
   * Validates a slot start Date:
   *  1. Must be a valid Date (not NaN).
   *  2. Must be strictly in the future.
   *  3. Minute component (UTC) must be 0 or 30 (30-minute slot boundaries).
   *
   * The SLOT_DURATION_MINUTES constant is imported from the domain to keep
   * this check consistent with the rest of the slot model.
   */
  private _validateSlotDate(slotStart: Date): void {
    if (isNaN(slotStart.getTime())) {
      throw new BadRequestException('Invalid date provided for slotStart.');
    }
    if (slotStart <= new Date()) {
      throw new BadRequestException(
        'Appointment slot must be in the future.',
      );
    }

    // Each slot is SLOT_DURATION_MINUTES (30 min) long, starting at :00 or :30
    const validMinutes = [0, 60 - SLOT_DURATION_MINUTES]; // [0, 30]
    const minutes = slotStart.getUTCMinutes();
    if (!validMinutes.includes(minutes)) {
      throw new BadRequestException(
        `Slot start must align to a ${SLOT_DURATION_MINUTES}-minute boundary (:00 or :30 UTC). ` +
          `Received :${String(minutes).padStart(2, '0')} UTC.`,
      );
    }
  }
}
