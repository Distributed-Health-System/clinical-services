/**
 * Exception for when a Telemedicine session is not found.
 */
export class TelemedicineNotFoundException extends Error {
  constructor(id: string) {
    super(`Telemedicine session with id "${id}" was not found.`);
    this.name = 'TelemedicineNotFoundException';
  }
}
