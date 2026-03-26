import { Controller } from '@nestjs/common';
import { AppointmentService } from '../../application/services/appointment.service';

/**
 * Placeholder controller for Appointment.
 */
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}
}
