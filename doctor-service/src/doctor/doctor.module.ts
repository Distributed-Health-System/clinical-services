import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DoctorSchemaClass,
  DoctorSchema,
} from './infrastructure/database/mongo/schemas/doctor.schema';
import { MongoDoctorRepository } from './infrastructure/database/mongo/repositories/mongo-doctor.repository';
import { DoctorService } from './application/services/doctor.service';
import { DoctorController } from './presentation/controllers/doctor.controller';
import { DOCTOR_REPOSITORY } from './domain/repositories/doctor.repository.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DoctorSchemaClass.name, schema: DoctorSchema },
    ]),
  ],
  controllers: [DoctorController],
  providers: [
    DoctorService,
    {
      provide: DOCTOR_REPOSITORY,
      useClass: MongoDoctorRepository,
    },
  ],
})
export class DoctorModule {}
