import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';

/**
 * UpdateAppointmentStatusDto
 *
 * Validates the request body for PATCH /appointments/:id/status.
 * Used exclusively by doctors to accept or reject a PENDING appointment.
 *
 * The service enforces:
 *   - The caller's role must be DOCTOR.
 *   - The appointment's doctorId must match the authenticated user's userId.
 *   - The appointment's current status must be PENDING.
 *
 * Only CONFIRMED and REJECTED are valid transition targets from PENDING via this endpoint.
 * Other values (CANCELLED, COMPLETED, PENDING) are rejected by the service layer, not here,
 * to keep clear error messages ("Doctors can only confirm or reject appointments").
 */
export class UpdateAppointmentStatusDto {
  @ApiProperty({
    description:
      'The new status for the appointment. ' +
      'Only CONFIRMED and REJECTED are accepted via this endpoint.',
    enum: [AppointmentStatus.CONFIRMED, AppointmentStatus.REJECTED],
    example: AppointmentStatus.CONFIRMED,
  })
  @IsNotEmpty({ message: 'status is required.' })
  @IsEnum(AppointmentStatus, {
    message: `status must be a valid AppointmentStatus value: ${Object.values(AppointmentStatus).join(', ')}`,
  })
  status: AppointmentStatus;
}
