import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PatientSchemaClass,
  PatientSchema,
} from './infrastructure/database/mongo/schemas/patient.schema';
import { MongoPatientRepository } from './infrastructure/database/mongo/repositories/mongo-patient.repository';
import { PatientService } from './application/services/patient.service';
import { PatientController } from './presentation/controllers/patient.controller';
import { PATIENT_REPOSITORY } from './domain/repositories/patient.repository.interface';
import { PrescriptionProxyService } from './application/services/prescription-proxy.service';
import { GatewayAuthGuard } from './presentation/guards/gateway-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { FirebaseStorageService } from './application/services/firebase-storage.service';

/**
 * Module definition for Patient.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientSchemaClass.name, schema: PatientSchema },
    ]),
  ],
  controllers: [PatientController],
  providers: [
    PatientService,
    PrescriptionProxyService,
    FirebaseStorageService,
    GatewayAuthGuard,
    RolesGuard,
    Reflector,
    {
      provide: PATIENT_REPOSITORY,
      useClass: MongoPatientRepository,
    },
  ],
})
export class PatientModule {}
