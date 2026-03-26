import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Patient, PatientSchema } from './infrastructure/database/mongo/schemas/patient.schema';
import { MongoPatientRepository } from './infrastructure/database/mongo/repositories/mongo-patient.repository';
import { PatientService } from './application/services/patient.service';
import { PatientController } from './presentation/controllers/patient.controller';

/**
 * Module definition for Patient.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Patient.name, schema: PatientSchema }]),
  ],
  controllers: [PatientController],
  providers: [
    PatientService,
    MongoPatientRepository,
  ],
})
export class PatientModule {}
