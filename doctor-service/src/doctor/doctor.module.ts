import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Doctor, DoctorSchema } from './infrastructure/database/mongo/schemas/doctor.schema';
import { MongoDoctorRepository } from './infrastructure/database/mongo/repositories/mongo-doctor.repository';
import { DoctorService } from './application/services/doctor.service';
import { DoctorController } from './presentation/controllers/doctor.controller';

/**
 * Module definition for Doctor.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
  ],
  controllers: [DoctorController],
  providers: [
    DoctorService,
    MongoDoctorRepository,
  ],
})
export class DoctorModule {}
