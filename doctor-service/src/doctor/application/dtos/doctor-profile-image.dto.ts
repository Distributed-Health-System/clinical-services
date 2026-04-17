import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateDoctorProfileImageUploadIntentDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @Matches(/^(image\/jpeg|image\/png|image\/webp)$/)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  sizeBytes: number;
}

export class FinalizeDoctorProfileImageUploadDto {
  @IsString()
  @IsNotEmpty()
  blobKey: string;

  @IsString()
  @Matches(/^(image\/jpeg|image\/png|image\/webp)$/)
  mimeType: string;

  @IsDateString()
  uploadedAt: string;
}
