import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';

/** E.164: + followed by country code and subscriber number (max 15 digits total). */
const E164_PHONE =
  /^\+[1-9]\d{6,14}$/;

export class CreateNotificationDto {
  @IsString()
  appointmentId: string;

  @IsEmail()
  patientEmail: string;

  @IsEmail()
  @IsOptional()
  doctorEmail?: string;

  @IsString()
  @IsOptional()
  patientName?: string;

  @IsString()
  @IsOptional()
  doctorName?: string;

  @IsISO8601()
  startsAt: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsUrl({ require_tld: false }, { message: 'meetingUrl must be a valid URL.' })
  @IsOptional()
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(E164_PHONE, {
    message:
      'patientPhone must be E.164 (e.g. +15551234567). Omit the field if unknown.',
  })
  patientPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(E164_PHONE, {
    message:
      'doctorPhone must be E.164 (e.g. +15551234567). Omit the field if unknown.',
  })
  doctorPhone?: string;
}
