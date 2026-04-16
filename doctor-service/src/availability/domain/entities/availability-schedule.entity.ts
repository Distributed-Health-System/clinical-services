import type {
  AvailabilityScheduleData,
  BreakRule,
  DateOverride,
  WeeklyRule,
} from '../schedule.types';

export class AvailabilityScheduleEntity implements AvailabilityScheduleData {
  id!: string;
  doctorUserId!: string;
  doctorProfileId!: string;
  timezone!: string;
  slotDurationMinutes!: number;
  weeklyRules!: WeeklyRule[];
  breakRules!: BreakRule[];
  dateOverrides!: DateOverride[];
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
