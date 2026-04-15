/**
 * AppointmentStatus Enum
 *
 * Represents the full lifecycle of an appointment booking within the system.
 * This is a core domain concept and must be the single source of truth for
 * status values across all layers (entity, schema, DTOs, service logic).
 *
 * State transition rules (enforced in the Application layer):
 *   PENDING   → CONFIRMED  (Doctor accepts)
 *   PENDING   → REJECTED   (Doctor rejects)
 *   PENDING   → CANCELLED  (Patient cancels before doctor acts)
 *   CONFIRMED → COMPLETED  (After the appointment date passes — future automated job)
 *   CONFIRMED → CANCELLED  (Patient or admin cancels a confirmed appointment)
 */
export enum AppointmentStatus {
  /** Initial state when a patient submits a booking request. */
  PENDING = 'PENDING',

  /** Doctor has accepted the appointment. A telemedicine link will be generated. */
  CONFIRMED = 'CONFIRMED',

  /** Patient or admin has cancelled the appointment. */
  CANCELLED = 'CANCELLED',

  /** The appointment has been attended and concluded. */
  COMPLETED = 'COMPLETED',

  /** Doctor has rejected the appointment request. */
  REJECTED = 'REJECTED',
}
