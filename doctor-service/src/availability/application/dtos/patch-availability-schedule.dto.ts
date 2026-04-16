import { PartialType } from '@nestjs/mapped-types';
import { PutAvailabilityScheduleDto } from './put-availability-schedule.dto';

export class PatchAvailabilityScheduleDto extends PartialType(
  PutAvailabilityScheduleDto,
) {}
