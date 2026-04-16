import { IsOptional, IsString } from 'class-validator';

export class RevokePrescriptionDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
