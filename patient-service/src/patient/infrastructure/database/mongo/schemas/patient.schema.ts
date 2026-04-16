import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class PrescriptionRefSchemaClass {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  blobKey: string;
  @Prop({ required: true })
  fileUrl: string;
  @Prop({ required: true })
  mimeType: string;
  @Prop({ required: true })
  uploadedByDoctorId: string;
  @Prop({ required: true })
  issuedAt: Date;
  @Prop()
  notes?: string;
  @Prop({ default: 'doctor-service' })
  sourceService?: string;
  @Prop({ default: Date.now })
  createdAt: Date;
  @Prop({ default: Date.now })
  updatedAt: Date;
}

@Schema({ _id: false })
export class ReportRefSchemaClass {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  blobKey: string;
  @Prop({ required: true })
  fileUrl: string;
  @Prop({ required: true })
  mimeType: string;
  @Prop({ required: true, enum: ['patient'], default: 'patient' })
  uploadedBy: 'patient';
  @Prop({ required: true })
  uploadedById: string;
  @Prop({ required: true })
  uploadedAt: Date;
  @Prop({ enum: ['lab', 'scan', 'discharge', 'other'] })
  category?: 'lab' | 'scan' | 'discharge' | 'other';
  @Prop({ default: 'patient-service' })
  sourceService?: string;
  @Prop({ default: Date.now })
  createdAt: Date;
  @Prop({ default: Date.now })
  updatedAt: Date;
}

@Schema({ collection: 'patients_amzal', timestamps: true })
export class PatientSchemaClass {
  @Prop({ required: true, unique: true, index: true })
  userId: string;
  @Prop({ required: true })
  firstName: string;
  @Prop({ required: true })
  lastName: string;
  @Prop({ required: true, unique: true })
  email: string;
  @Prop({ required: true })
  dateOfBirth: Date;
  @Prop({ required: true, enum: ['male', 'female', 'other'] })
  gender: 'male' | 'female' | 'other';
  @Prop({ default: '' })
  phone: string;
  @Prop({ default: '' })
  address: string;
  @Prop({ enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  @Prop({ type: [String], default: [] })
  allergies: string[];
  @Prop({ default: '' })
  medicalHistory: string;
  @Prop({ default: '' })
  emergencyContactName: string;
  @Prop({ default: '' })
  emergencyContactPhone: string;
  @Prop({ default: '' })
  profileImageUrl: string;
  @Prop({ default: true })
  isActive: boolean;
  /** Deprecated source of truth: prescriptions now come from doctor-service. */
  @Prop({ type: [PrescriptionRefSchemaClass], default: [] })
  prescriptions: PrescriptionRefSchemaClass[];
  @Prop({ type: [ReportRefSchemaClass], default: [] })
  reports: ReportRefSchemaClass[];
  createdAt: Date;
  updatedAt: Date;
}

export type PatientDocument = HydratedDocument<PatientSchemaClass>;
export const PatientSchema = SchemaFactory.createForClass(PatientSchemaClass);
PatientSchema.index({ userId: 1, isActive: 1 });
PatientSchema.index({ 'prescriptions.uploadedByDoctorId': 1 });
