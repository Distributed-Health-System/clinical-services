/**
 * Exception for when an Appointment is not found.
 */
export class AppointmentNotFoundException extends Error {
  constructor(id: string) {
    super(`Appointment with id "${id}" was not found.`);
    this.name = 'AppointmentNotFoundException';
  }
}
