/**
 * Exception for when a Patient is not found.
 */
export class PatientNotFoundException extends Error {
  constructor(id: string) {
    super(`Patient with id "${id}" was not found.`);
    this.name = 'PatientNotFoundException';
  }
}
