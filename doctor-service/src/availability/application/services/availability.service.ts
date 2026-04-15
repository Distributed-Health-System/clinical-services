import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DoctorService } from '../../../doctor/application/services/doctor.service';
import type { IAvailabilityScheduleRepository } from '../../domain/repositories/availability-schedule.repository.interface';
import { AVAILABILITY_SCHEDULE_REPOSITORY } from '../../domain/repositories/availability-schedule.repository.interface';
import { AvailabilityScheduleEntity } from '../../domain/entities/availability-schedule.entity';
import { PutAvailabilityScheduleDto } from '../dtos/put-availability-schedule.dto';
import { PatchAvailabilityScheduleDto } from '../dtos/patch-availability-schedule.dto';
import { DateOverrideDto } from '../dtos/date-override.dto';
import type { AvailabilityScheduleData } from '../../domain/schedule.types';
import {
  computeFreeUtcSlots,
  isStartOfBookableSlot,
  parseHmToMinutes,
  utcHalfHourAligned,
} from '../slot-engine';

@Injectable()
export class AvailabilityService {
  constructor(
    @Inject(AVAILABILITY_SCHEDULE_REPOSITORY)
    private readonly availabilityRepository: IAvailabilityScheduleRepository,
    private readonly doctorService: DoctorService,
    private readonly config: ConfigService,
  ) {}

  private assertValidTimezone(tz: string): void {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
    } catch {
      throw new BadRequestException(`Invalid IANA timezone: ${tz}`);
    }
  }

  private hmToMinutes(hm: string): number {
    try {
      return parseHmToMinutes(hm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid time';
      throw new BadRequestException(msg);
    }
  }

  private validateWindowsAndRules(dto: PutAvailabilityScheduleDto): void {
    for (const rule of dto.weeklyRules) {
      for (const w of rule.windows) {
        const a = this.hmToMinutes(w.start);
        const b = this.hmToMinutes(w.end);
        if (!(a < b)) {
          throw new BadRequestException(
            `Weekly window ${w.start}-${w.end} must have start < end.`,
          );
        }
      }
    }
    for (const br of dto.breakRules ?? []) {
      const a = this.hmToMinutes(br.start);
      const b = this.hmToMinutes(br.end);
      if (!(a < b)) {
        throw new BadRequestException(
          `Break ${br.start}-${br.end} must have start < end.`,
        );
      }
    }
    for (const ov of dto.dateOverrides ?? []) {
      if (!ov.isOff && (!ov.windows || ov.windows.length === 0)) {
        throw new BadRequestException(
          `Override on ${ov.date} must include windows when isOff is false.`,
        );
      }
      if (ov.windows) {
        for (const w of ov.windows) {
          const a = this.hmToMinutes(w.start);
          const b = this.hmToMinutes(w.end);
          if (!(a < b)) {
            throw new BadRequestException(
              `Override window ${w.start}-${w.end} must have start < end.`,
            );
          }
        }
      }
    }
    if (dto.effectiveFrom && dto.effectiveTo) {
      if (dto.effectiveFrom > dto.effectiveTo) {
        throw new BadRequestException(
          'effectiveFrom must be on or before effectiveTo.',
        );
      }
    }

    if (!dto.weeklyRules?.length) {
      throw new BadRequestException('At least one weekly rule is required.');
    }

    const step = this.config.get<number>('appointmentSlotStepMinutes') ?? 30;
    if (dto.slotDurationMinutes % step !== 0) {
      throw new BadRequestException(
        `slotDurationMinutes must be a multiple of ${step} (appointment grid).`,
      );
    }
  }

  private toData(e: AvailabilityScheduleEntity): AvailabilityScheduleData {
    return {
      timezone: e.timezone,
      slotDurationMinutes: e.slotDurationMinutes,
      weeklyRules: e.weeklyRules,
      breakRules: e.breakRules ?? [],
      dateOverrides: e.dateOverrides ?? [],
      effectiveFrom: e.effectiveFrom,
      effectiveTo: e.effectiveTo,
      isActive: e.isActive,
    };
  }

  async getMy(authUserId: string): Promise<AvailabilityScheduleEntity | null> {
    await this.doctorService.requireDoctorByUserId(authUserId);
    return this.availabilityRepository.findByDoctorUserId(authUserId);
  }

  async putMy(
    authUserId: string,
    dto: PutAvailabilityScheduleDto,
  ): Promise<AvailabilityScheduleEntity> {
    const doctor = await this.doctorService.requireDoctorByUserId(authUserId);
    this.assertValidTimezone(dto.timezone);
    this.validateSchedulePayload(dto);

    return this.availabilityRepository.upsertForDoctor(authUserId, doctor.id, {
      timezone: dto.timezone,
      slotDurationMinutes: dto.slotDurationMinutes,
      weeklyRules: dto.weeklyRules,
      breakRules: dto.breakRules ?? [],
      dateOverrides: dto.dateOverrides ?? [],
      effectiveFrom: dto.effectiveFrom,
      effectiveTo: dto.effectiveTo,
      isActive: dto.isActive ?? true,
    });
  }

  private validateSchedulePayload(dto: PutAvailabilityScheduleDto): void {
    this.validateWindowsAndRules(dto);
  }

  async patchMy(
    authUserId: string,
    dto: PatchAvailabilityScheduleDto,
  ): Promise<AvailabilityScheduleEntity> {
    await this.doctorService.requireDoctorByUserId(authUserId);
    const existing = await this.availabilityRepository.findByDoctorUserId(
      authUserId,
    );
    if (!existing) {
      throw new NotFoundException(
        'No availability schedule yet. Use PUT /doctors/me/availability first.',
      );
    }

    if (dto.timezone !== undefined) this.assertValidTimezone(dto.timezone);

    const merged: PutAvailabilityScheduleDto = {
      timezone: dto.timezone ?? existing.timezone,
      slotDurationMinutes:
        dto.slotDurationMinutes ?? existing.slotDurationMinutes,
      weeklyRules: dto.weeklyRules ?? existing.weeklyRules,
      breakRules: dto.breakRules ?? existing.breakRules ?? [],
      dateOverrides: dto.dateOverrides ?? existing.dateOverrides ?? [],
      effectiveFrom: dto.effectiveFrom ?? existing.effectiveFrom,
      effectiveTo: dto.effectiveTo ?? existing.effectiveTo,
      isActive: dto.isActive ?? existing.isActive,
    };
    this.validateWindowsAndRules(merged);

    const updated = await this.availabilityRepository.patchForDoctor(
      authUserId,
      dto as Partial<AvailabilityScheduleEntity>,
    );
    if (!updated) throw new NotFoundException('Schedule not found.');
    return updated;
  }

  async addOverride(
    authUserId: string,
    dto: DateOverrideDto,
  ): Promise<AvailabilityScheduleEntity> {
    await this.doctorService.requireDoctorByUserId(authUserId);
    const existing = await this.availabilityRepository.findByDoctorUserId(
      authUserId,
    );
    if (!existing) {
      throw new NotFoundException(
        'No availability schedule yet. Use PUT /doctors/me/availability first.',
      );
    }
    const putDto: PutAvailabilityScheduleDto = {
      timezone: existing.timezone,
      slotDurationMinutes: existing.slotDurationMinutes,
      weeklyRules: existing.weeklyRules,
      breakRules: existing.breakRules ?? [],
      dateOverrides: [...(existing.dateOverrides ?? [])],
      effectiveFrom: existing.effectiveFrom,
      effectiveTo: existing.effectiveTo,
      isActive: existing.isActive,
    };
    const idx = putDto.dateOverrides!.findIndex((o) => o.date === dto.date);
    if (idx >= 0) putDto.dateOverrides!.splice(idx, 1);
    putDto.dateOverrides!.push(dto);
    this.validateWindowsAndRules(putDto);

    const updated = await this.availabilityRepository.patchForDoctor(
      authUserId,
      {
        dateOverrides: putDto.dateOverrides,
      },
    );
    if (!updated) throw new NotFoundException('Schedule not found.');
    return updated;
  }

  async removeOverride(
    authUserId: string,
    date: string,
  ): Promise<AvailabilityScheduleEntity> {
    await this.doctorService.requireDoctorByUserId(authUserId);
    const existing = await this.availabilityRepository.findByDoctorUserId(
      authUserId,
    );
    if (!existing) {
      throw new NotFoundException('No availability schedule found.');
    }
    const next = (existing.dateOverrides ?? []).filter((o) => o.date !== date);
    const updated = await this.availabilityRepository.patchForDoctor(
      authUserId,
      { dateOverrides: next },
    );
    if (!updated) throw new NotFoundException('Schedule not found.');
    return updated;
  }

  async getFreeSlotsForDoctorUser(
    doctorUserId: string,
    fromIso: string,
    toIso: string,
  ): Promise<{ slots: string[] }> {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Invalid from or to date.');
    }
    if (from >= to) {
      throw new BadRequestException('from must be before to.');
    }

    const schedule = await this.availabilityRepository.findByDoctorUserId(
      doctorUserId,
    );
    if (!schedule) {
      return { slots: [] };
    }

    const data = this.toData(schedule);
    const slots = computeFreeUtcSlots(data, from, to, schedule.slotDurationMinutes);
    return { slots: slots.map((d) => d.toISOString()) };
  }

  async validateSlot(
    doctorUserId: string,
    slotStartIso: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    const slotStart = new Date(slotStartIso);
    if (isNaN(slotStart.getTime())) {
      return { valid: false, reason: 'Invalid slotStart date.' };
    }

    const step = this.config.get<number>('appointmentSlotStepMinutes') ?? 30;
    if (!utcHalfHourAligned(slotStart)) {
      return {
        valid: false,
        reason: `slotStart must align to UTC ${step}-minute grid (:00 / :30 UTC).`,
      };
    }

    const schedule = await this.availabilityRepository.findByDoctorUserId(
      doctorUserId,
    );
    if (!schedule) {
      return { valid: false, reason: 'Doctor has no availability schedule.' };
    }
    if (!schedule.isActive) {
      return { valid: false, reason: 'Doctor availability is inactive.' };
    }

    const data = this.toData(schedule);
    if (
      !isStartOfBookableSlot(data, slotStart, schedule.slotDurationMinutes)
    ) {
      return {
        valid: false,
        reason: 'Slot is outside doctor availability, breaks, or overrides.',
      };
    }

    return { valid: true };
  }
}
