import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class TimeWindowSchemaClass {
  @Prop({ required: true })
  start!: string;

  @Prop({ required: true })
  end!: string;
}

@Schema({ _id: false })
export class WeeklyRuleSchemaClass {
  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek!: number;

  @Prop({ type: [TimeWindowSchemaClass], required: true, default: [] })
  windows!: TimeWindowSchemaClass[];
}

@Schema({ _id: false })
export class BreakRuleSchemaClass {
  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek!: number;

  @Prop({ required: true })
  start!: string;

  @Prop({ required: true })
  end!: string;
}

@Schema({ _id: false })
export class DateOverrideSchemaClass {
  @Prop({ required: true })
  date!: string;

  @Prop({ required: true })
  isOff!: boolean;

  @Prop({ type: [TimeWindowSchemaClass], default: [] })
  windows?: TimeWindowSchemaClass[];
}

export type AvailabilityScheduleDocument =
  HydratedDocument<AvailabilityScheduleSchemaClass>;

@Schema({ collection: 'doctor_availability_schedules', timestamps: true })
export class AvailabilityScheduleSchemaClass {
  @Prop({ required: true, unique: true, index: true })
  doctorUserId!: string;

  @Prop({ required: true, index: true })
  doctorProfileId!: string;

  @Prop({ required: true })
  timezone!: string;

  @Prop({ required: true, default: 30 })
  slotDurationMinutes!: number;

  @Prop({ type: [WeeklyRuleSchemaClass], default: [] })
  weeklyRules!: WeeklyRuleSchemaClass[];

  @Prop({ type: [BreakRuleSchemaClass], default: [] })
  breakRules!: BreakRuleSchemaClass[];

  @Prop({ type: [DateOverrideSchemaClass], default: [] })
  dateOverrides!: DateOverrideSchemaClass[];

  @Prop()
  effectiveFrom?: string;

  @Prop()
  effectiveTo?: string;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const AvailabilityScheduleSchema = SchemaFactory.createForClass(
  AvailabilityScheduleSchemaClass,
);
