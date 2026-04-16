import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MedicationLineDto } from './medication-line.dto';
import { PrescriptionArtifactDto } from './prescription-artifact.dto';

/** At least one field should be present — enforced in service if needed. */
export class AmendPrescriptionDto {
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MedicationLineDto)
  items?: MedicationLineDto[];

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PrescriptionArtifactDto)
  artifact?: PrescriptionArtifactDto;
}
