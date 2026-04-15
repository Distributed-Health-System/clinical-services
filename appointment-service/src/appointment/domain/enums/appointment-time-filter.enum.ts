/**
 * AppointmentTimeFilter Enum
 *
 * Used as an optional filter parameter on repository query methods
 * (findByPatientId, findByDoctorId) to retrieve appointments by their
 * temporal position relative to the current moment.
 *
 * The boundary calculations use SLOT_DURATION_MINUTES from domain constants:
 *
 *   PAST    : slotStart + SLOT_DURATION_MINUTES <= now
 *             (the slot has fully elapsed)
 *
 *   CURRENT : slotStart <= now < slotStart + SLOT_DURATION_MINUTES
 *             (the appointment is in progress right now)
 *
 *   UPCOMING: slotStart > now
 *             (the slot has not yet started)
 *
 * When no filter is provided, all appointments for that user are returned.
 */
export enum AppointmentTimeFilter {
  PAST = 'PAST',
  CURRENT = 'CURRENT',
  UPCOMING = 'UPCOMING',
}
