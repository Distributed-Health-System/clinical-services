import { TZDate } from '@date-fns/tz';
import type { AvailabilityScheduleData } from '../domain/schedule.types';

export type {
  AvailabilityScheduleData,
  BreakRule,
  DateOverride,
  TimeWindow,
  WeeklyRule,
} from '../domain/schedule.types';

const HM = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export function parseHmToMinutes(hm: string): number {
  const m = HM.exec(hm.trim());
  if (!m) {
    throw new Error(`Invalid time "${hm}". Use HH:mm (24h).`);
  }
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function localDateKey(z: TZDate): string {
  const y = z.getFullYear();
  const mo = String(z.getMonth() + 1).padStart(2, '0');
  const d = String(z.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function minuteOfLocalDay(z: TZDate): number {
  return z.getHours() * 60 + z.getMinutes();
}

/**
 * Whether `instant` (UTC) is the start of a bookable slot: inside weekly/overrides,
 * not in breaks, within effective range. Does not check UTC grid alignment.
 */
export function isInstantInsideAvailability(
  schedule: AvailabilityScheduleData,
  instant: Date,
): boolean {
  if (!schedule.isActive) return false;

  const z = new TZDate(instant, schedule.timezone);
  const key = localDateKey(z);

  if (schedule.effectiveFrom && key < schedule.effectiveFrom) return false;
  if (schedule.effectiveTo && key > schedule.effectiveTo) return false;

  const override = schedule.dateOverrides.find((o) => o.date === key);
  if (override?.isOff) return false;

  let windows: { startM: number; endM: number }[];

  if (override?.windows?.length) {
    windows = override.windows.map((w) => ({
      startM: parseHmToMinutes(w.start),
      endM: parseHmToMinutes(w.end),
    }));
  } else {
    const dow = z.getDay();
    const rule = schedule.weeklyRules.find((r) => r.dayOfWeek === dow);
    if (!rule?.windows?.length) return false;
    windows = rule.windows.map((w) => ({
      startM: parseHmToMinutes(w.start),
      endM: parseHmToMinutes(w.end),
    }));
  }

  const mod = minuteOfLocalDay(z);
  const inWindow = windows.some((w) => mod >= w.startM && mod < w.endM);
  if (!inWindow) return false;

  const dow = z.getDay();
  for (const br of schedule.breakRules ?? []) {
    if (br.dayOfWeek !== dow) continue;
    const bs = parseHmToMinutes(br.start);
    const be = parseHmToMinutes(br.end);
    if (mod >= bs && mod < be) return false;
  }

  return true;
}

/** UTC half-hour grid aligned to epoch (same as appointment-service :00 / :30 UTC). */
export function iterUtcHalfHourStarts(from: Date, to: Date): Date[] {
  const HALF_MS = 30 * 60 * 1000;
  const out: Date[] = [];
  let t = Math.ceil(from.getTime() / HALF_MS) * HALF_MS;
  const end = to.getTime();
  while (t <= end) {
    out.push(new Date(t));
    t += HALF_MS;
  }
  return out;
}

export function utcHalfHourAligned(instant: Date): boolean {
  const HALF_MS = 30 * 60 * 1000;
  return instant.getTime() % HALF_MS === 0;
}

/**
 * Contiguous availability for slotDurationMinutes starting at instant (all instants
 * in the range must fall inside availability windows — simplified for 30-min slots).
 */
export function isStartOfBookableSlot(
  schedule: AvailabilityScheduleData,
  instant: Date,
  slotDurationMinutes: number,
): boolean {
  if (!utcHalfHourAligned(instant)) return false;
  if (!isInstantInsideAvailability(schedule, instant)) return false;
  if (slotDurationMinutes <= 30) return true;
  const next = new Date(instant.getTime() + 30 * 60 * 1000);
  if (slotDurationMinutes === 60) {
    return (
      isInstantInsideAvailability(schedule, next) && utcHalfHourAligned(next)
    );
  }
  return false;
}

export function computeFreeUtcSlots(
  schedule: AvailabilityScheduleData,
  from: Date,
  to: Date,
  slotDurationMinutes: number,
): Date[] {
  return iterUtcHalfHourStarts(from, to).filter((t) =>
    isStartOfBookableSlot(schedule, t, slotDurationMinutes),
  );
}
