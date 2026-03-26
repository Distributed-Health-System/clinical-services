import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Patient as PatientEntity } from '../../../../domain/entities/patient.entity';

export type PatientDocument = PatientEntity & Document;

/**
 * Placeholder Mongoose schema for Patient.
 */
@Schema({ timestamps: true })
export class Patient {}

export const PatientSchema = SchemaFactory.createForClass(Patient);
