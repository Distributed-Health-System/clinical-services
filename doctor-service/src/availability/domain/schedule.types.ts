export type TimeWindow = { start: string; end: string };

export type WeeklyRule = { dayOfWeek: number; windows: TimeWindow[] };

export type BreakRule = { dayOfWeek: number; start: string; end: string };

export type DateOverride = {
  date: string;
  isOff: boolean;
  windows?: TimeWindow[];
};

export type AvailabilityScheduleData = {
  timezone: string;
  slotDurationMinutes: number;
  weeklyRules: WeeklyRule[];
  breakRules: BreakRule[];
  dateOverrides: DateOverride[];
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive: boolean;
};
