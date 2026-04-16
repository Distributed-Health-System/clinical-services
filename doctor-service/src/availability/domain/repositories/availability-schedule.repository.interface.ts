import { AvailabilityScheduleEntity } from '../entities/availability-schedule.entity';

export const AVAILABILITY_SCHEDULE_REPOSITORY =
  'AVAILABILITY_SCHEDULE_REPOSITORY';

export interface IAvailabilityScheduleRepository {
  findByDoctorUserId(
    doctorUserId: string,
  ): Promise<AvailabilityScheduleEntity | null>;
  upsertForDoctor(
    doctorUserId: string,
    doctorProfileId: string,
    data: Partial<AvailabilityScheduleEntity>,
  ): Promise<AvailabilityScheduleEntity>;
  patchForDoctor(
    doctorUserId: string,
    patch: Partial<AvailabilityScheduleEntity>,
  ): Promise<AvailabilityScheduleEntity | null>;
}
