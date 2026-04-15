import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MedicationLineDto } from './medication-line.dto';
import { PrescriptionArtifactDto } from './prescription-artifact.dto';

export class CreatePrescriptionDto {
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MedicationLineDto)
  items: MedicationLineDto[];

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  issuedAt?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrescriptionArtifactDto)
  artifact?: PrescriptionArtifactDto;
}
