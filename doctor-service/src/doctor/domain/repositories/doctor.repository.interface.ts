import { DoctorEntity } from '../entities/doctor.entity';

export const DOCTOR_REPOSITORY = 'DOCTOR_REPOSITORY';

export interface IDoctorRepository {
  findAll(
    onlyApproved?: boolean,
    options?: { specialization?: string },
  ): Promise<DoctorEntity[]>;
  findById(id: string): Promise<DoctorEntity | null>;
  findByUserId(userId: string): Promise<DoctorEntity | null>;
  findByEmail(email: string): Promise<DoctorEntity | null>;
  create(doctor: Partial<DoctorEntity>): Promise<DoctorEntity>;
  update(id: string, doctor: Partial<DoctorEntity>): Promise<DoctorEntity | null>;
  delete(id: string): Promise<boolean>;
}
