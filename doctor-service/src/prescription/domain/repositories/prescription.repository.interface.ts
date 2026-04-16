import { PrescriptionEntity } from '../entities/prescription.entity';
import { PrescriptionStatus } from '../enums/prescription-status.enum';

export const PRESCRIPTION_REPOSITORY = 'PRESCRIPTION_REPOSITORY';

export interface IPrescriptionRepository {
  create(data: Partial<PrescriptionEntity>): Promise<PrescriptionEntity>;
  findById(id: string): Promise<PrescriptionEntity | null>;
  findByDoctorUserId(
    doctorUserId: string,
    options?: { patientId?: string; statuses?: PrescriptionStatus[] },
  ): Promise<PrescriptionEntity[]>;
  updateStatus(
    id: string,
    status: PrescriptionStatus,
    extras?: { revocationReason?: string; revokedAt?: Date },
  ): Promise<PrescriptionEntity | null>;
}
