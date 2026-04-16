import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { GatewayAuthGuard } from '../doctor/presentation/guards/gateway-auth.guard';
import { RolesGuard } from '../doctor/presentation/guards/roles.guard';
import { Roles } from '../doctor/presentation/decorators/roles.decorator';
import { PatientReportsProxyService } from './patient-reports-proxy.service';

/**
 * Lets an approved doctor view patient-uploaded reports via patient-service.
 * Authorization beyond "is a doctor" should be enforced later (e.g. shared appointment).
 */
@Controller('doctors/me/patients')
@UseGuards(GatewayAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorMePatientReportsController {
  constructor(
    private readonly patientReportsProxy: PatientReportsProxyService,
  ) {}

  @Get(':patientId/reports')
  getPatientReports(
    @Param('patientId') patientId: string,
    @Req() req: Request,
    @Query('category') category?: 'lab' | 'scan' | 'discharge' | 'other',
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('sort') sort?: string,
  ) {
    return this.patientReportsProxy.getReportsForDoctor(
      req['userId'] as string,
      patientId,
      { category, limit, offset, sort },
    );
  }
}
