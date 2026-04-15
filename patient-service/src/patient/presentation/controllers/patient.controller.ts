import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PatientService } from '../../application/services/patient.service';
import { CreatePatientDto, PrescriptionRefDto, ReportRefDto } from '../../application/dtos/create-patient.dto';
import { UpdatePatientDto } from '../../application/dtos/update-patient.dto';

@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get()
  findAll() {
    return this.patientService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientService.findById(id);
  }

  @Get(':id/prescriptions')
  getPrescriptions(
    @Param('id') id: string,
    @Query('uploadedByDoctorId') uploadedByDoctorId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('sort') sort?: string,
  ) {
    return this.patientService.getPrescriptions(id, {
      uploadedByDoctorId,
      limit,
      offset,
      sort,
    });
  }

  @Get(':id/reports')
  getReports(
    @Param('id') id: string,
    @Query('category') category?: 'lab' | 'scan' | 'discharge' | 'other',
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    @Query('sort') sort?: string,
  ) {
    return this.patientService.getReports(id, {
      category,
      limit,
      offset,
      sort,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePatientDto) {
    return this.patientService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.patientService.delete(id);
  }

  @Post(':id/prescriptions')
  addPrescription(@Param('id') id: string, @Body() dto: PrescriptionRefDto) {
    return this.patientService.addPrescription(id, dto);
  }

  @Delete(':id/prescriptions/:prescriptionId')
  removePrescription(
    @Param('id') id: string,
    @Param('prescriptionId') prescriptionId: string,
  ) {
    return this.patientService.removePrescription(id, prescriptionId);
  }

  @Post(':id/reports')
  addReport(@Param('id') id: string, @Body() dto: ReportRefDto) {
    return this.patientService.addReport(id, dto);
  }

  @Delete(':id/reports/:reportId')
  removeReport(@Param('id') id: string, @Param('reportId') reportId: string) {
    return this.patientService.removeReport(id, reportId);
  }
}
