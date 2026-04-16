import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrescriptionService } from '../../application/services/prescription.service';
import { CreatePrescriptionDto } from '../../application/dtos/create-prescription.dto';
import { AmendPrescriptionDto } from '../../application/dtos/amend-prescription.dto';
import { RevokePrescriptionDto } from '../../application/dtos/revoke-prescription.dto';
import { GatewayAuthGuard } from '../../../doctor/presentation/guards/gateway-auth.guard';
import { RolesGuard } from '../../../doctor/presentation/guards/roles.guard';
import { Roles } from '../../../doctor/presentation/decorators/roles.decorator';

@Controller('doctors/me/prescriptions')
@UseGuards(GatewayAuthGuard, RolesGuard)
@Roles('doctor')
export class PrescriptionController {
  constructor(private readonly prescriptionService: PrescriptionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePrescriptionDto, @Req() req: Request) {
    return this.prescriptionService.create(dto, req['userId'] as string);
  }

  @Get()
  list(
    @Req() req: Request,
    @Query('patientId') patientId?: string,
    @Query('includeHistory') includeHistory?: string,
  ) {
    const inc = includeHistory === 'true' || includeHistory === '1';
    return this.prescriptionService.listForMe(req['userId'] as string, {
      patientId,
      includeHistory: inc,
    });
  }

  @Get('for-patient/:patientId')
  listForPatient(
    @Param('patientId') patientId: string,
    @Req() req: Request,
    @Query('includeHistory') includeHistory?: string,
  ) {
    const inc = includeHistory === 'true' || includeHistory === '1';
    return this.prescriptionService.listForMe(req['userId'] as string, {
      patientId,
      includeHistory: inc,
    });
  }

  @Get(':prescriptionId')
  findOne(@Param('prescriptionId') prescriptionId: string, @Req() req: Request) {
    return this.prescriptionService.findOneForDoctor(
      prescriptionId,
      req['userId'] as string,
    );
  }

  @Patch(':prescriptionId/amend')
  amend(
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: AmendPrescriptionDto,
    @Req() req: Request,
  ) {
    return this.prescriptionService.amend(
      prescriptionId,
      dto,
      req['userId'] as string,
    );
  }

  @Patch(':prescriptionId/revoke')
  revoke(
    @Param('prescriptionId') prescriptionId: string,
    @Body() dto: RevokePrescriptionDto,
    @Req() req: Request,
  ) {
    return this.prescriptionService.revoke(
      prescriptionId,
      req['userId'] as string,
      dto?.reason,
    );
  }
}
