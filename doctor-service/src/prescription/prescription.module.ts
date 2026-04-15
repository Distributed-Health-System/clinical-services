import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorModule } from '../doctor/doctor.module';
import {
  PrescriptionSchema,
  PrescriptionSchemaClass,
} from './infrastructure/database/mongo/schemas/prescription.schema';
import { MongoPrescriptionRepository } from './infrastructure/database/mongo/repositories/mongo-prescription.repository';
import { PRESCRIPTION_REPOSITORY } from './domain/repositories/prescription.repository.interface';
import { PrescriptionService } from './application/services/prescription.service';
import { PrescriptionController } from './presentation/controllers/prescription.controller';

@Module({
  imports: [
    DoctorModule,
    MongooseModule.forFeature([
      { name: PrescriptionSchemaClass.name, schema: PrescriptionSchema },
    ]),
  ],
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    {
      provide: PRESCRIPTION_REPOSITORY,
      useClass: MongoPrescriptionRepository,
    },
  ],
  exports: [PrescriptionService],
})
export class PrescriptionModule {}
