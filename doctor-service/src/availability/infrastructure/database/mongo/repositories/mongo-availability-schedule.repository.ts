import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AvailabilityScheduleDocument,
  AvailabilityScheduleSchemaClass,
} from '../schemas/availability-schedule.schema';
import { IAvailabilityScheduleRepository } from '../../../../domain/repositories/availability-schedule.repository.interface';
import { AvailabilityScheduleEntity } from '../../../../domain/entities/availability-schedule.entity';

@Injectable()
export class MongoAvailabilityScheduleRepository
  implements IAvailabilityScheduleRepository
{
  constructor(
    @InjectModel(AvailabilityScheduleSchemaClass.name)
    private readonly model: Model<AvailabilityScheduleDocument>,
  ) {}

  private toEntity(doc: AvailabilityScheduleDocument): AvailabilityScheduleEntity {
    const e = new AvailabilityScheduleEntity();
    e.id = (doc._id as object).toString();
    e.doctorUserId = doc.doctorUserId;
    e.doctorProfileId = doc.doctorProfileId;
    e.timezone = doc.timezone;
    e.slotDurationMinutes = doc.slotDurationMinutes;
    e.weeklyRules = doc.weeklyRules as AvailabilityScheduleEntity['weeklyRules'];
    e.breakRules = doc.breakRules as AvailabilityScheduleEntity['breakRules'];
    e.dateOverrides =
      doc.dateOverrides as AvailabilityScheduleEntity['dateOverrides'];
    e.effectiveFrom = doc.effectiveFrom;
    e.effectiveTo = doc.effectiveTo;
    e.isActive = doc.isActive;
    e.createdAt = doc.createdAt;
    e.updatedAt = doc.updatedAt;
    return e;
  }

  async findByDoctorUserId(
    doctorUserId: string,
  ): Promise<AvailabilityScheduleEntity | null> {
    const doc = await this.model.findOne({ doctorUserId }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async upsertForDoctor(
    doctorUserId: string,
    doctorProfileId: string,
    data: Partial<AvailabilityScheduleEntity>,
  ): Promise<AvailabilityScheduleEntity> {
    const doc = await this.model
      .findOneAndUpdate(
        { doctorUserId },
        {
          $set: {
            ...data,
            doctorUserId,
            doctorProfileId,
          },
        },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();
    return this.toEntity(doc!);
  }

  async patchForDoctor(
    doctorUserId: string,
    patch: Partial<AvailabilityScheduleEntity>,
  ): Promise<AvailabilityScheduleEntity | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { doctorUserId },
        { $set: patch },
        { new: true, runValidators: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }
}
