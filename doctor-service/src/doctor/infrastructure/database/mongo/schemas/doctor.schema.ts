import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Doctor as DoctorEntity } from '../../../../domain/entities/doctor.entity';

export type DoctorDocument = DoctorEntity & Document;

/**
 * Placeholder Mongoose schema for Doctor.
 */
@Schema({ timestamps: true })
export class Doctor {}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
