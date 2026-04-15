export type Gender = 'male' | 'female' | 'other';
export type BloodGroup =
  | 'A+'
  | 'A-'
  | 'B+'
  | 'B-'
  | 'AB+'
  | 'AB-'
  | 'O+'
  | 'O-';
export type ReportUploadedBy = 'patient';

export class PrescriptionRef {
  id: string;
  title: string;
  blobKey: string;
  fileUrl: string;
  mimeType: string;
  uploadedByDoctorId: string;
  issuedAt: Date;
  notes?: string;
  sourceService?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ReportRef {
  id: string;
  title: string;
  blobKey: string;
  fileUrl: string;
  mimeType: string;
  uploadedBy: ReportUploadedBy;
  uploadedById: string;
  uploadedAt: Date;
  category?: 'lab' | 'scan' | 'discharge' | 'other';
  sourceService?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PatientEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  gender: Gender;
  phone: string;
  address: string;
  bloodGroup?: BloodGroup;
  allergies: string[];
  medicalHistory: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  profileImageUrl: string;
  isActive: boolean;
  prescriptions: PrescriptionRef[];
  reports: ReportRef[];
  createdAt: Date;
  updatedAt: Date;
}
