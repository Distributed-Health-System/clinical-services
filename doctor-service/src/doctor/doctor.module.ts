import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reflector } from '@nestjs/core';
import {
  DoctorSchemaClass,
  DoctorSchema,
} from './infrastructure/database/mongo/schemas/doctor.schema';
import { MongoDoctorRepository } from './infrastructure/database/mongo/repositories/mongo-doctor.repository';
import { DoctorService } from './application/services/doctor.service';
import { FirebaseStorageService } from './application/services/firebase-storage.service';
import { DoctorController } from './presentation/controllers/doctor.controller';
import { DOCTOR_REPOSITORY } from './domain/repositories/doctor.repository.interface';
import { KeycloakAdminService } from './infrastructure/keycloak/keycloak-admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorSchemaClass.name, schema: DoctorSchema },
    ]),
  ],
  controllers: [DoctorController],
  providers: [
    DoctorService,
    FirebaseStorageService,
    KeycloakAdminService,
    Reflector,
    {
      provide: DOCTOR_REPOSITORY,
      useClass: MongoDoctorRepository,
    },
  ],
  exports: [DoctorService],
})
export class DoctorModule {}
