import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto, PrescriptionRefDto, ReportRefDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class AddPrescriptionDto extends PrescriptionRefDto {}

export class AddReportDto extends ReportRefDto {}
