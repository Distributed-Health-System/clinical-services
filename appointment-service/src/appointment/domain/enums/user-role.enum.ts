/**
 * UserRole Enum
 *
 * Defines the three actor roles within the Appointment bounded context.
 * This enum lives in the Domain layer so both the Application layer (service
 * authorization checks) and the Presentation layer (AuthGuard, controller)
 * can import it without creating a circular dependency.
 *
 * Roles are set by the authentication system (AuthGuard) and flow down
 * through the controller as part of the authenticated request user object.
 */
export enum UserRole {
  /** A patient who can book, view, modify, and cancel their own appointments. */
  PATIENT = 'PATIENT',

  /** A doctor who can view appointments assigned to them and accept/reject them. */
  DOCTOR = 'DOCTOR',

  /** A platform administrator who can view all appointments across the system. */
  ADMIN = 'ADMIN',
}
