import { PatientEntity, ReportRef } from '../entities/patient.entity';

export const PATIENT_REPOSITORY = 'PATIENT_REPOSITORY';

export interface IPatientRepository {
  findAll(): Promise<PatientEntity[]>;
  findById(id: string): Promise<PatientEntity | null>;
  findByUserId(userId: string): Promise<PatientEntity | null>;
  findByEmail(email: string): Promise<PatientEntity | null>;
  create(patient: Partial<PatientEntity>): Promise<PatientEntity>;
  update(id: string, patient: Partial<PatientEntity>): Promise<PatientEntity | null>;
  delete(id: string): Promise<boolean>;
  addReport(id: string, report: ReportRef): Promise<PatientEntity | null>;
  removeReport(id: string, reportId: string): Promise<PatientEntity | null>;
}
