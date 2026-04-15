import { Module } from '@nestjs/common';
import { DoctorModule } from '../doctor/doctor.module';
import { PatientReportsProxyService } from './patient-reports-proxy.service';
import { DoctorMePatientReportsController } from './doctor-me-patient-reports.controller';

@Module({
  imports: [DoctorModule],
  controllers: [DoctorMePatientReportsController],
  providers: [PatientReportsProxyService],
})
export class PatientProxyModule {}
