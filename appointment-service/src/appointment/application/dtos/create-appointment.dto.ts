import { IsDateString, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateAppointmentDto
 *
 * Validates the request body for the POST /appointments endpoint.
 * Used by patients to book a new appointment.
 *
 * Note on slotStart:
 *   Provided as an ISO 8601 date-time string (e.g. "2025-06-20T09:00:00.000Z").
 *   The service converts it to a Date and validates:
 *     - Must be in the future.
 *     - Must align to a :00 or :30 minute boundary (30-minute slots).
 *
 * Note on doctorId:
 *   The Doctor Management Service owns availability schedules.
 *   This service does NOT validate whether the doctor exists or is available —
 *   it only enforces that no other booking occupies the same slot for this doctor.
 */
export class CreateAppointmentDto {
  @ApiProperty({
    description: 'The ID of the doctor to book an appointment with.',
    example: 'doctor_abc123',
  })
  @IsNotEmpty({ message: 'doctorId is required.' })
  @IsString()
  doctorId: string;

  @ApiProperty({
    description:
      'The requested slot start time as an ISO 8601 UTC date-time string. ' +
      'Must be a future time aligned to :00 or :30 minutes (30-minute slots).',
    example: '2025-06-20T09:00:00.000Z',
  })
  @IsNotEmpty({ message: 'slotStart is required.' })
  @IsDateString({}, { message: 'slotStart must be a valid ISO 8601 date-time string.' })
  slotStart: string;

  @ApiProperty({
    description: "The patient's stated reason for the visit.",
    example: 'Persistent headache and mild fever for 3 days.',
  })
  @IsNotEmpty({ message: 'reasonForVisit is required.' })
  @IsString()
  reasonForVisit: string;
}
