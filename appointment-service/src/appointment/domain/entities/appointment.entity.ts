import { AppointmentStatus } from '../enums/appointment-status.enum';

/**
 * Appointment — Domain Entity
 *
 * The central aggregate root for the Appointment bounded context.
 * Pure TypeScript — no framework or persistence decorators.
 *
 * --- Slot Model ---
 * Every appointment occupies a fixed-duration time slot defined by:
 *   - slotStart : the exact Date/time the slot begins (stored in UTC)
 *   - duration  : SLOT_DURATION_MINUTES (30 min, a system constant — NOT stored on entity)
 *   - slotEnd   = slotStart + 30 minutes (derived, not stored)
 *
 * This model means:
 *   - Two appointments conflict if they share the same doctor AND slotStart.
 *   - Two appointments conflict if they share the same patient AND slotStart.
 *   - "Current" = now is within [slotStart, slotStart + 30min).
 *   - A compound unique index on (doctorId + slotStart) and (patientId + slotStart)
 *     is enforced at the database layer (appointment.schema.ts).
 *   - The application service validates for conflicts BEFORE calling the repository,
 *     providing a friendly error message rather than relying solely on DB constraints.
 *
 * --- Lifecycle ---
 *   PENDING → CONFIRMED  (doctor accepts  → telemedicine link generated)
 *   PENDING → REJECTED   (doctor rejects)
 *   PENDING → CANCELLED  (patient cancels before decision)
 *   CONFIRMED → COMPLETED (post-slot automated job — future)
 *   CONFIRMED → CANCELLED (patient/admin cancels confirmed appointment)
 */
export class Appointment {
  /** Unique identifier (MongoDB ObjectId serialised as a string). */
  id: string;

  /**
   * The ID of the patient who booked this appointment.
   * Set from the authenticated user's token (userId where role = PATIENT).
   */
  patientId: string;

  /**
   * The ID of the doctor this appointment is booked with.
   * Provided by the patient at booking time.
   * NOTE: Availability validation is owned by the Doctor Management Service.
   *       This service only enforces that no OTHER booking already occupies
   *       the same slot for this doctor or patient.
   */
  doctorId: string;

  /**
   * The exact UTC Date/time at which the appointment slot starts.
   *
   * Rules enforced at booking time:
   *  - Must be a valid future Date.
   *  - Must align to a valid slot boundary (minutes must be :00 or :30).
   *  - No other PENDING or CONFIRMED appointment may share this slotStart
   *    for the same doctorId (doctor conflict).
   *  - No other PENDING or CONFIRMED appointment may share this slotStart
   *    for the same patientId (patient conflict).
   */
  slotStart: Date;

  /**
   * Current lifecycle status of the appointment.
   * Defaults to PENDING on creation.
   */
  status: AppointmentStatus;

  /**
   * Patient's stated reason for the visit.
   * Helps the doctor make an informed accept/reject decision.
   */
  reasonForVisit: string;

  /**
   * A URL for the telemedicine video session.
   * Populated by the Application Service after calling the Telemedicine Service
   * when the appointment transitions to CONFIRMED.
   * Undefined for PENDING, REJECTED, and CANCELLED appointments.
   */
  telemedicineLink?: string;

  /**
   * The payment status for this appointment.
   * Tracked via the Payment Service (infrastructure/external/payment.client.ts).
   * Defaults to 'PENDING' at booking time.
   *
   * Possible values (owned by the Payment Service vocabulary):
   *   'PENDING'   — awaiting payment confirmation
   *   'CONFIRMED' — payment successfully processed
   *   'FAILED'    — payment was unsuccessful
   */
  paymentStatus: string;
}
