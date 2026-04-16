import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { PatientService } from '../../application/services/patient.service';
import { CreatePatientDto, ReportRefDto } from '../../application/dtos/create-patient.dto';
import { UpdatePatientDto } from '../../application/dtos/update-patient.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('patients')
@UseGuards(GatewayAuthGuard, RolesGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  @Roles('admin')
  findAll(@Req() req: Request) {
    return this.patientService.findAll(req['userRole'] as string);
  }

  @Get('me')
  @Roles('patient')
  findMe(@Req() req: Request) {
    return this.patientService.findMyByUserId(req['userId'] as string);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.patientService.getByIdForRequester(
      id,
      req['userId'] as string,
      req['userRole'] as string,
    );
  }

  @Get(':id/prescriptions')
  getPrescriptions(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('includeHistory') includeHistory?: string,
  ) {
    const inc = includeHistory === 'true' || includeHistory === '1';
    return this.patientService.getPrescriptions(
      id,
      { includeHistory: inc },
      req['userId'] as string,
      req['userRole'] as string,
    );
  }

  @Get(':id/reports')
  getReports(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('category') category?: 'lab' | 'scan' | 'discharge' | 'other',
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('sort') sort?: string,
  ) {
    return this.patientService.getReports(
      id,
      { category, limit, offset, sort },
      req['userId'] as string,
      req['userRole'] as string,
    );
  }

  @Post()
  @Roles('patient')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePatientDto, @Req() req: Request) {
    return this.patientService.create(dto, req['userId'] as string);
  }

  @Patch('me')
  @Roles('patient')
  updateMe(@Body() dto: UpdatePatientDto, @Req() req: Request) {
    return this.patientService.updateMy(req['userId'] as string, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto, @Req() req: Request) {
    return this.patientService.update(
      id,
      dto,
      req['userId'] as string,
      req['userRole'] as string,
    );
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.patientService.delete(id, req['userRole'] as string);
  }

  @Post(':id/reports')
  @Roles('patient')
  addReport(@Param('id') id: string, @Body() dto: ReportRefDto, @Req() req: Request) {
    return this.patientService.addReport(
      id,
      dto,
      req['userId'] as string,
      req['userRole'] as string,
    );
  }

  @Delete(':id/reports/:reportId')
  @Roles('patient', 'admin')
  removeReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @Req() req: Request,
  ) {
    return this.patientService.removeReport(
      id,
      reportId,
      req['userId'] as string,
      req['userRole'] as string,
    );
  }
}
