import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto, ReportRefDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class AddReportDto extends ReportRefDto {}
