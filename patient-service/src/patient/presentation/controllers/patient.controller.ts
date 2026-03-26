import { Controller } from '@nestjs/common';
import { PatientService } from '../../application/services/patient.service';

/**
 * Placeholder controller for Patient.
 */
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}
}
