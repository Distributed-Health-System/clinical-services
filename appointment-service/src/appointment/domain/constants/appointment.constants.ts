/**
 * Appointment Domain Constants
 *
 * System-wide business rules for the Appointment bounded context.
 * These values are intentionally NOT stored on the entity — they are invariants
 * of the system, not data. Storing them here makes them the single source of
 * truth for any layer that needs to reason about slot boundaries.
 */

/**
 * The fixed duration of every appointment slot, in minutes.
 * All appointments occupy exactly one slot of this length.
 *
 * This value is used to:
 *  - Calculate the slot end time:  slotEnd = slotStart + SLOT_DURATION_MINUTES
 *  - Detect conflicts:             any overlap with an existing PENDING or CONFIRMED
 *                                  appointment for the same doctor or patient.
 *  - Categorise temporal state:    an appointment is "current" while
 *                                  now >= slotStart && now < slotStart + duration.
 */
export const SLOT_DURATION_MINUTES = 30;

/**
 * The set of appointment statuses that "occupy" a slot for conflict detection.
 * CANCELLED and REJECTED appointments free up the slot and should NOT block
 * a new booking for the same doctor/patient at the same time.
 */
export const SLOT_BLOCKING_STATUSES = ['PENDING', 'CONFIRMED'];
