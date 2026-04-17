export class DoctorEntity {
  id!: string;
  userId!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string;
  specialization!: string;
  licenseNumber!: string;
  yearsOfExperience!: number;
  bio!: string;
  profileImageUrl!: string;
  profileImageBlobKey!: string;
  isAvailable!: boolean;
  isApproved!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
