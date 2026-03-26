/**
 * Exception for when a Doctor is not found.
 */
export class DoctorNotFoundException extends Error {
  constructor(id: string) {
    super(`Doctor with id "${id}" was not found.`);
    this.name = 'DoctorNotFoundException';
  }
}
