import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemedicineSession, TelemedicineSchema } from './infrastructure/database/mongo/schemas/telemedicine.schema';
import { MongoTelemedicineRepository } from './infrastructure/database/mongo/repositories/mongo-telemedicine.repository';
import { TelemedicineService } from './application/services/telemedicine.service';
import { TelemedicineController } from './presentation/controllers/telemedicine.controller';

/**
 * Module definition for Telemedicine.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: TelemedicineSession.name, schema: TelemedicineSchema }]),
  ],
  controllers: [TelemedicineController],
  providers: [
    TelemedicineService,
    MongoTelemedicineRepository,
  ],
})
export class TelemedicineModule {}
