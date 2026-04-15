import { IsEnum, IsOptional } from 'class-validator';
import { IsIn } from 'class-validator';
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointment.dto';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';

/**
 * UpdateAppointmentDto
 *
 * Validates the request body for PATCH /appointments/:id.
 * Used by patients to modify or cancel an existing appointment.
 *
 * Extends CreateAppointmentDto as a partial — the patient can change any
 * combination of doctorId, slotStart, and reasonForVisit. At least one
 * field must be provided (enforced in the service layer).
 *
 * The status field is additionally available but ONLY the value CANCELLED
 * is accepted from a patient (enforced in the service layer with a clear error).
 *
 * Service rules:
 *   - Cannot modify a COMPLETED or REJECTED appointment.
 *   - Rescheduling (changing slotStart) resets status back to PENDING so the
 *     doctor must re-confirm the new time.
 *   - Slot conflict checks are re-run if slotStart changes.
 */
export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  @ApiPropertyOptional({
    description:
      'Set to CANCELLED to cancel this appointment. ' +
      'Patients cannot set any other status value.',
    enum: [AppointmentStatus.CANCELLED],
    example: AppointmentStatus.CANCELLED,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus, {
    message: `status must be a valid AppointmentStatus value.`,
  })
  @IsIn([AppointmentStatus.CANCELLED], {
    message: 'Patients can only set status to CANCELLED.',
  })
  status?: AppointmentStatus;
}
