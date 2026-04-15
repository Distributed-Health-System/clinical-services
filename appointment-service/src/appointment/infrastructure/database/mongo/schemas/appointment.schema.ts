import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Appointment as AppointmentEntity } from '../../../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../../../domain/enums/appointment-status.enum';

/**
 * AppointmentDocument
 *
 * The Mongoose document type for an Appointment.
 * Intersects the domain entity (for field typing) with Mongoose's Document
 * (for _id, save(), etc.). The repository mapper converts this back to a
 * plain Appointment domain entity before returning it to the service layer.
 */
export type AppointmentDocument = AppointmentEntity & Document;

/**
 * Appointment — Mongoose Schema Class
 *
 * This class is the Mongoose persistence representation of an appointment.
 * It mirrors the domain entity's fields but lives in the Infrastructure layer.
 *
 * Key design decisions:
 *  - `slotStart` is stored as a native MongoDB Date (always UTC).
 *  - `status` defaults to PENDING — enforced at the DB level as a safety net.
 *  - `telemedicineLink` is sparse (optional) — only present on CONFIRMED appointments.
 *  - `paymentStatus` defaults to 'PENDING' until the Payment Service responds.
 *
 * Indexes (defined below the schema):
 *  - Compound index on { doctorId, slotStart } for fast conflict checks and doctor queries.
 *  - Compound index on { patientId, slotStart } for fast conflict checks and patient queries.
 *  - Single index on { slotStart } for temporal range queries (PAST/CURRENT/UPCOMING).
 *
 * NOTE: These indexes are NOT unique because slot conflict checks filter by status
 * (PENDING or CONFIRMED only). A cancelled appointment at the same slot must NOT
 * block a future booking. Uniqueness is enforced programmatically in the service layer.
 */
@Schema({ timestamps: true, collection: 'appointments' })
export class Appointment {
  /**
   * ID of the patient who created this booking.
   * Sourced from the AuthGuard-extracted user payload.
   */
  @Prop({ required: true, index: true })
  patientId: string;

  /**
   * ID of the doctor this appointment is with.
   * Provided by the patient — not validated against the Doctor Service here.
   */
  @Prop({ required: true, index: true })
  doctorId: string;

  /**
   * The slot start time (UTC Date).
   * Every appointment occupies exactly SLOT_DURATION_MINUTES (30 min) from this point.
   * Must align to :00 or :30 — enforced in the Application Service before reaching here.
   */
  @Prop({ required: true, type: Date })
  slotStart: Date;

  /**
   * Current lifecycle status.
   * Defaults to PENDING. Valid values are the AppointmentStatus enum members.
   */
  @Prop({
    required: true,
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  /** Patient's stated reason for the visit. */
  @Prop({ required: true, trim: true })
  reasonForVisit: string;

  /**
   * Telemedicine session URL.
   * Optional — populated only when the appointment is CONFIRMED and the
   * Telemedicine Service has successfully returned a session link.
   */
  @Prop({ required: false, default: null })
  telemedicineLink: string;

  /**
   * Payment status from the Payment Service.
   * Defaults to 'PENDING'. Updated asynchronously once the Payment Service
   * processes the transaction. Possible values: 'PENDING' | 'CONFIRMED' | 'FAILED'.
   */
  @Prop({ required: true, default: 'PENDING' })
  paymentStatus: string;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// ---------------------------------------------------------------------------
// Compound Indexes for Query Performance
// ---------------------------------------------------------------------------
// Used heavily by findByDoctorId, hasSlotConflictForDoctor
AppointmentSchema.index({ doctorId: 1, slotStart: 1 });

// Used heavily by findByPatientId, hasSlotConflictForPatient
AppointmentSchema.index({ patientId: 1, slotStart: 1 });

// Used by all temporal range queries (PAST / CURRENT / UPCOMING)
AppointmentSchema.index({ slotStart: 1 });
