import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxDate,
  ValidateNested,
} from 'class-validator';

export class PrescriptionRefDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  blobKey: string;

  @IsUrl()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  uploadedByDoctorId: string;

  @IsDateString()
  issuedAt: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  sourceService?: string;

  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @IsDateString()
  @IsOptional()
  updatedAt?: string;
}

export class ReportRefDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  blobKey: string;

  @IsUrl()
  fileUrl: string;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsEnum(['patient'])
  @IsOptional()
  uploadedBy?: 'patient';

  @IsString()
  @IsNotEmpty()
  uploadedById: string;

  @IsDateString()
  uploadedAt: string;

  @IsEnum(['lab', 'scan', 'discharge', 'other'])
  @IsOptional()
  category?: 'lab' | 'scan' | 'discharge' | 'other';

  @IsString()
  @IsOptional()
  sourceService?: string;

  @IsDateString()
  @IsOptional()
  createdAt?: string;

  @IsDateString()
  @IsOptional()
  updatedAt?: string;
}

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Type(() => Date)
  @IsDate()
  @MaxDate(new Date())
  dateOfBirth: Date;

  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @IsString()
  @Matches(/^[+()\-.\s0-9]{7,20}$/)
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  @IsOptional()
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allergies?: string[];

  @IsString()
  @IsOptional()
  medicalHistory?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @Matches(/^[+()\-.\s0-9]{7,20}$/)
  @IsOptional()
  emergencyContactPhone?: string;

  @IsUrl()
  @IsOptional()
  profileImageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionRefDto)
  @IsOptional()
  prescriptions?: PrescriptionRefDto[];

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReportRefDto)
  @IsOptional()
  reports?: ReportRefDto[];
}
