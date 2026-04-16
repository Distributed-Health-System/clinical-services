import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { PrescriptionService } from '../../application/services/prescription.service';
import { ServiceOrGatewayAuthGuard } from '../../../common/guards/service-or-gateway-auth.guard';

@Controller('doctors/integration/patients')
@UseGuards(ServiceOrGatewayAuthGuard)
export class PrescriptionIntegrationController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Get(':patientId/prescriptions')
  listForPatient(
    @Param('patientId') patientId: string,
    @Query('includeHistory') includeHistory?: string,
  ) {
    const inc = includeHistory === 'true' || includeHistory === '1';
    return this.prescriptionService.listForPatient(patientId, {
      includeHistory: inc,
    });
  }
}
