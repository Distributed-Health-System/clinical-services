import { Controller } from '@nestjs/common';
import { TelemedicineService } from '../../application/services/telemedicine.service';

/**
 * Placeholder controller for Telemedicine.
 */
@Controller('telemedicine-sessions')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}
}
