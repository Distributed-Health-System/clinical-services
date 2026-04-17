import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';

/**
 * AppointmentResponseDto
 *
 * API response shape for appointment resources returned to frontend clients.
 * Telemedicine links are role-masked in the presentation mapper:
 * - DOCTOR: doctor link only
 * - PATIENT: patient link only
 * - ADMIN: both links
 */
export class AppointmentResponseDto {
  @ApiProperty({ description: 'Appointment ID (Mongo ObjectId).' })
  id: string;

  @ApiProperty({ description: 'Patient user ID.' })
  patientId: string;

  @ApiProperty({ description: 'Doctor user ID.' })
  doctorId: string;

  @ApiProperty({
    description: 'Appointment slot start in UTC.',
    type: String,
    format: 'date-time',
    example: '2026-04-20T09:00:00.000Z',
  })
  slotStart: Date;

  @ApiProperty({
    enum: AppointmentStatus,
    description: 'Current appointment lifecycle status.',
  })
  status: AppointmentStatus;

  @ApiProperty({ description: 'Reason provided by patient for the visit.' })
  reasonForVisit: string;

  @ApiProperty({
    description:
      "Payment status from payment workflow: 'PENDING' | 'CONFIRMED' | 'FAILED'.",
    example: 'CONFIRMED',
  })
  paymentStatus: string;

  @ApiPropertyOptional({
    description: 'Payment provider transaction ID, when available.',
    example: 'txn_12345abcde',
  })
  paymentTransactionId?: string;

  @ApiPropertyOptional({
    description:
      'Doctor telemedicine join URL (only returned to doctor/admin).',
    example: 'https://meet.jit.si/telemed-abc-host',
  })
  telemedicineLinkDoctor?: string;

  @ApiPropertyOptional({
    description:
      'Patient telemedicine join URL (only returned to patient/admin).',
    example: 'https://meet.jit.si/telemed-abc-guest',
  })
  telemedicineLinkPatient?: string;
}
