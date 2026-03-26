import { Controller } from '@nestjs/common';
import { DoctorService } from '../../application/services/doctor.service';

/**
 * Placeholder controller for Doctor.
 */
@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}
}
