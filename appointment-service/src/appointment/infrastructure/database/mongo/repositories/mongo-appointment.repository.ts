import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from '../schemas/appointment.schema';

/**
 * Placeholder Mongo repository implementation for Appointment.
 */
@Injectable()
export class MongoAppointmentRepository {
  constructor(
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}
}
