import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TelemedicineSession as TelemedicineSessionEntity } from '../../../../domain/entities/telemedicine.entity';

export type TelemedicineDocument = TelemedicineSessionEntity & Document;

/**
 * Placeholder Mongoose schema for TelemedicineSession.
 */
@Schema({ timestamps: true })
export class TelemedicineSession {}

export const TelemedicineSchema = SchemaFactory.createForClass(TelemedicineSession);
