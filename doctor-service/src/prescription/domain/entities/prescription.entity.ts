import { PrescriptionStatus } from '../enums/prescription-status.enum';

export class MedicationLine {
  name!: string;
  dosage!: string;
  frequency!: string;
  duration!: string;
  instructions?: string;
}

export class PrescriptionArtifact {
  blobKey?: string;
  fileUrl?: string;
  mimeType?: string;
}

export class PrescriptionEntity {
  id!: string;
  doctorUserId!: string;
  doctorProfileId!: string;
  patientId!: string;
  appointmentId?: string;
  version!: number;
  status!: PrescriptionStatus;
  previousPrescriptionId?: string;
  items!: MedicationLine[];
  diagnosis?: string;
  notes?: string;
  issuedAt!: Date;
  validUntil?: Date;
  artifact?: PrescriptionArtifact;
  revocationReason?: string;
  revokedAt?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
