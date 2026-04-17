import { Appointment } from '../entities/appointment.entity';
import { AppointmentStatus } from '../enums/appointment-status.enum';
import { AppointmentTimeFilter } from '../enums/appointment-time-filter.enum';

// ---------------------------------------------------------------------------
// DI Injection Token
// ---------------------------------------------------------------------------
/**
 * APPOINTMENT_REPOSITORY injection token.
 *
 * Using a typed constant avoids raw string literals in @Inject() calls,
 * preventing typo bugs and improving refactoring safety. Used in:
 *   - appointment.module.ts  (provide: APPOINTMENT_REPOSITORY, useClass: MongoAppointmentRepository)
 *   - appointment.service.ts (@Inject(APPOINTMENT_REPOSITORY))
 */
export const APPOINTMENT_REPOSITORY = 'APPOINTMENT_REPOSITORY';

// ---------------------------------------------------------------------------
// Repository Interface
// ---------------------------------------------------------------------------
/**
 * IAppointmentRepository — Domain Repository Interface
 *
 * Defines the full persistence contract for the Appointment aggregate.
 * Lives in the Domain layer: zero knowledge of Mongoose, MongoDB, or any
 * infrastructure technology.
 *
 * The concrete implementation (MongoAppointmentRepository) lives in the
 * Infrastructure layer and is bound to this token via NestJS DI.
 *
 * All methods return plain Appointment domain entities — never raw Mongoose docs.
 *
 * --- Slot Conflict Checking ---
 * Before creating an appointment, the Application Service MUST call both
 * hasSlotConflictForDoctor() and hasSlotConflictForPatient() to provide
 * user-friendly errors. The database schema also enforces uniqueness at the
 * DB level as a safety net.
 *
 * --- Temporal Filtering ---
 * findByPatientId() and findByDoctorId() accept an optional AppointmentTimeFilter
 * to return only PAST, CURRENT, or UPCOMING appointments. When omitted, all
 * appointments for that user are returned regardless of time.
 */
export interface IAppointmentRepository {
  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  /**
   * Persists a new Appointment and returns the saved entity with its generated id.
   * @param appointment - A fully constructed domain object (without id).
   */
  create(appointment: Omit<Appointment, 'id'>): Promise<Appointment>;

  /**
   * Performs a partial update on an Appointment's mutable fields.
   * Used by the patient modify/cancel flow.
   *
   * @param id      - The appointment to update.
   * @param partial - A subset of Appointment fields to apply.
   * @returns The updated entity, or null if not found.
   */
  update(id: string, partial: Partial<Appointment>): Promise<Appointment | null>;

  /**
   * Updates the status of an Appointment and optionally attaches a telemedicine link.
   * Used by the doctor accept/reject flow. When a booking is CONFIRMED, the
   * Telemedicine Service URL is attached here in a single atomic update.
   *
   * @param id               - The appointment to update.
   * @param status           - The new AppointmentStatus value.
   * @param telemedicineLink - Optional session URL from the Telemedicine Service.
   * @returns The updated entity, or null if not found.
   */
  updateStatus(
    id: string,
    status: AppointmentStatus,
    telemedicineLinkDoctor?: string,
    telemedicineLinkPatient?: string,
  ): Promise<Appointment | null>;

  // -------------------------------------------------------------------------
  // Read — Single
  // -------------------------------------------------------------------------

  /**
   * Retrieves a single Appointment by its unique identifier.
   * Returns null if no appointment exists with the given id.
   */
  findById(id: string): Promise<Appointment | null>;

  // -------------------------------------------------------------------------
  // Read — Collections
  // -------------------------------------------------------------------------

  /**
   * Retrieves ALL appointments in the system.
   * Intended for ADMIN role only (enforced in the Application Service, not here).
   */
  findAll(): Promise<Appointment[]>;

  /**
   * Retrieves appointments belonging to a specific patient.
   *
   * @param patientId  - The authenticated patient's user ID.
   * @param timeFilter - Optional temporal filter:
   *                     PAST     → slotStart + 30min <= now
   *                     CURRENT  → now is within [slotStart, slotStart + 30min)
   *                     UPCOMING → slotStart > now
   *                     omitted  → all appointments for this patient
   */
  findByPatientId(
    patientId: string,
    timeFilter?: AppointmentTimeFilter,
  ): Promise<Appointment[]>;

  /**
   * Retrieves appointments assigned to a specific doctor.
   *
   * @param doctorId   - The authenticated doctor's user ID.
   * @param timeFilter - Optional temporal filter (same semantics as findByPatientId).
   */
  findByDoctorId(
    doctorId: string,
    timeFilter?: AppointmentTimeFilter,
  ): Promise<Appointment[]>;

  // -------------------------------------------------------------------------
  // Slot Conflict Checks
  // -------------------------------------------------------------------------

  /**
   * Checks whether the given doctor already has a blocking appointment
   * (PENDING or CONFIRMED) at the exact same slot start time.
   *
   * A doctor cannot be double-booked in the same slot.
   *
   * @param doctorId  - The doctor to check.
   * @param slotStart - The requested slot start time (must match exactly).
   * @returns true if a conflict exists, false if the slot is free.
   */
  hasSlotConflictForDoctor(
    doctorId: string,
    slotStart: Date,
  ): Promise<boolean>;

  /**
   * Checks whether the given patient already has a blocking appointment
   * (PENDING or CONFIRMED) at the exact same slot start time.
   *
   * A patient cannot have two overlapping appointments.
   *
   * @param patientId - The patient to check.
   * @param slotStart - The requested slot start time (must match exactly).
   * @returns true if a conflict exists, false if the slot is free.
   */
  hasSlotConflictForPatient(
    patientId: string,
    slotStart: Date,
  ): Promise<boolean>;
}
