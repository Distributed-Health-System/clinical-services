export class DoctorEntity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialization: string;
  licenseNumber: string;
  yearsOfExperience: number;
  bio: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
