import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Appointment as AppointmentEntity } from '../../../../domain/entities/appointment.entity';

export type AppointmentDocument = AppointmentEntity & Document;

/**
 * Placeholder Mongoose schema for Appointment.
 */
@Schema({ timestamps: true })
export class Appointment {}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);
