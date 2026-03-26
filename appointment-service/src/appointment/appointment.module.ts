import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './infrastructure/database/mongo/schemas/appointment.schema';
import { MongoAppointmentRepository } from './infrastructure/database/mongo/repositories/mongo-appointment.repository';
import { AppointmentService } from './application/services/appointment.service';
import { AppointmentController } from './presentation/controllers/appointment.controller';

/**
 * Module definition for Appointment.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
  ],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    MongoAppointmentRepository,
  ],
})
export class AppointmentModule {}
