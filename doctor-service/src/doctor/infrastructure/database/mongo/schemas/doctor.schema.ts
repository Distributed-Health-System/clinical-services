import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DoctorDocument = HydratedDocument<DoctorSchemaClass>;

@Schema({ collection: 'doctors_amzal', timestamps: true })
export class DoctorSchemaClass {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ required: true })
  specialization: string;

  @Prop({ required: true, unique: true })
  licenseNumber: string;

  @Prop({ default: 0 })
  yearsOfExperience: number;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: true })
  isAvailable: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DoctorSchema = SchemaFactory.createForClass(DoctorSchemaClass);
