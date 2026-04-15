import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PrescriptionStatus } from '../../../../domain/enums/prescription-status.enum';

@Schema({ _id: false })
export class MedicationLineSchemaClass {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  dosage!: string;

  @Prop({ required: true })
  frequency!: string;

  @Prop({ required: true })
  duration!: string;

  @Prop()
  instructions?: string;
}

@Schema({ _id: false })
export class PrescriptionArtifactSchemaClass {
  @Prop()
  blobKey?: string;

  @Prop()
  fileUrl?: string;

  @Prop()
  mimeType?: string;
}

export type PrescriptionDocument = HydratedDocument<PrescriptionSchemaClass>;

@Schema({ collection: 'doctor_prescriptions', timestamps: true })
export class PrescriptionSchemaClass {
  @Prop({ required: true, index: true })
  doctorUserId!: string;

  @Prop({ required: true, index: true })
  doctorProfileId!: string;

  @Prop({ required: true, index: true })
  patientId!: string;

  @Prop({ index: true })
  appointmentId?: string;

  @Prop({ required: true, default: 1 })
  version!: number;

  @Prop({
    required: true,
    enum: PrescriptionStatus,
    default: PrescriptionStatus.ACTIVE,
    index: true,
  })
  status!: PrescriptionStatus;

  @Prop()
  previousPrescriptionId?: string;

  @Prop({ type: [MedicationLineSchemaClass], required: true, default: [] })
  items!: MedicationLineSchemaClass[];

  @Prop()
  diagnosis?: string;

  @Prop()
  notes?: string;

  @Prop({ required: true })
  issuedAt!: Date;

  @Prop()
  validUntil?: Date;

  @Prop({ type: PrescriptionArtifactSchemaClass })
  artifact?: PrescriptionArtifactSchemaClass;

  @Prop()
  revocationReason?: string;

  @Prop()
  revokedAt?: Date;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PrescriptionSchema = SchemaFactory.createForClass(
  PrescriptionSchemaClass,
);

PrescriptionSchema.index({ doctorUserId: 1, issuedAt: -1 });
PrescriptionSchema.index({ patientId: 1, issuedAt: -1 });
