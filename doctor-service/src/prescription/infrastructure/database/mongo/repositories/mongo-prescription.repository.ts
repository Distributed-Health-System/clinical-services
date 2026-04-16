import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PrescriptionDocument,
  PrescriptionSchemaClass,
} from '../schemas/prescription.schema';
import { IPrescriptionRepository } from '../../../../domain/repositories/prescription.repository.interface';
import {
  MedicationLine,
  PrescriptionArtifact,
  PrescriptionEntity,
} from '../../../../domain/entities/prescription.entity';
import { PrescriptionStatus } from '../../../../domain/enums/prescription-status.enum';

@Injectable()
export class MongoPrescriptionRepository implements IPrescriptionRepository {
  constructor(
    @InjectModel(PrescriptionSchemaClass.name)
    private readonly model: Model<PrescriptionDocument>,
  ) {}

  private toEntity(doc: PrescriptionDocument): PrescriptionEntity {
    const e = new PrescriptionEntity();
    e.id = (doc._id as object).toString();
    e.doctorUserId = doc.doctorUserId;
    e.doctorProfileId = doc.doctorProfileId;
    e.patientId = doc.patientId;
    e.appointmentId = doc.appointmentId;
    e.version = doc.version;
    e.status = doc.status;
    e.previousPrescriptionId = doc.previousPrescriptionId;
    e.items = doc.items as MedicationLine[];
    e.diagnosis = doc.diagnosis;
    e.notes = doc.notes;
    e.issuedAt = doc.issuedAt;
    e.validUntil = doc.validUntil;
    e.artifact = doc.artifact as PrescriptionArtifact | undefined;
    e.revocationReason = doc.revocationReason;
    e.revokedAt = doc.revokedAt;
    e.createdAt = doc.createdAt;
    e.updatedAt = doc.updatedAt;
    return e;
  }

  async create(data: Partial<PrescriptionEntity>): Promise<PrescriptionEntity> {
    const created = new this.model(data);
    const saved = await created.save();
    return this.toEntity(saved);
  }

  async findById(id: string): Promise<PrescriptionEntity | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByDoctorUserId(
    doctorUserId: string,
    options?: { patientId?: string; statuses?: PrescriptionStatus[] },
  ): Promise<PrescriptionEntity[]> {
    const filter: Record<string, unknown> = { doctorUserId };
    if (options?.patientId) filter.patientId = options.patientId;
    if (options?.statuses?.length) filter.status = { $in: options.statuses };
    const docs = await this.model
      .find(filter)
      .sort({ issuedAt: -1 })
      .exec();
    return docs.map((d) => this.toEntity(d));
  }

  async updateStatus(
    id: string,
    status: PrescriptionStatus,
    extras?: { revocationReason?: string; revokedAt?: Date },
  ): Promise<PrescriptionEntity | null> {
    const $set: Record<string, unknown> = { status };
    if (extras?.revocationReason !== undefined) {
      $set.revocationReason = extras.revocationReason;
    }
    if (extras?.revokedAt !== undefined) {
      $set.revokedAt = extras.revokedAt;
    }
    const doc = await this.model
      .findByIdAndUpdate(id, { $set }, { new: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }
}
