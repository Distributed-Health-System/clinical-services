import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateReportUploadIntentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @Matches(/^(application\/pdf|image\/jpeg|image\/png)$/)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes: number;

  @IsEnum(['lab', 'scan', 'discharge', 'other'])
  @IsOptional()
  category?: 'lab' | 'scan' | 'discharge' | 'other';
}

export class FinalizeReportUploadDto {
  @IsString()
  @IsNotEmpty()
  reportId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  blobKey: string;

  @IsString()
  @Matches(/^(application\/pdf|image\/jpeg|image\/png)$/)
  mimeType: string;

  @IsDateString()
  uploadedAt: string;

  @IsEnum(['lab', 'scan', 'discharge', 'other'])
  @IsOptional()
  category?: 'lab' | 'scan' | 'discharge' | 'other';
}
