import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MedicationLineDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  dosage: string;

  @IsString()
  @IsNotEmpty()
  frequency: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}
