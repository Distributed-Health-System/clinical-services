import { IsOptional, IsString } from 'class-validator';

export class PrescriptionArtifactDto {
  @IsString()
  @IsOptional()
  blobKey?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;
}
