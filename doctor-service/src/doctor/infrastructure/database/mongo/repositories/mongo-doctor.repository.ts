import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DoctorSchemaClass, DoctorDocument } from '../schemas/doctor.schema';
import { IDoctorRepository } from '../../../../domain/repositories/doctor.repository.interface';
import { DoctorEntity } from '../../../../domain/entities/doctor.entity';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class MongoDoctorRepository implements IDoctorRepository {
  constructor(
    @InjectModel(DoctorSchemaClass.name)
    private readonly doctorModel: Model<DoctorDocument>,
  ) {}

  private toEntity(doc: DoctorDocument): DoctorEntity {
    const entity = new DoctorEntity();
    entity.id = (doc._id as object).toString();
    entity.userId = doc.userId;
    entity.firstName = doc.firstName;
    entity.lastName = doc.lastName;
    entity.email = doc.email;
    entity.phone = doc.phone;
    entity.specialization = doc.specialization;
    entity.licenseNumber = doc.licenseNumber;
    entity.yearsOfExperience = doc.yearsOfExperience;
    entity.bio = doc.bio;
    entity.profileImageUrl = doc.profileImageUrl;
    entity.profileImageBlobKey = doc.profileImageBlobKey;
    entity.isAvailable = doc.isAvailable;
    entity.isApproved = doc.isApproved;
    entity.createdAt = doc.createdAt;
    entity.updatedAt = doc.updatedAt;
    return entity;
  }

  async findAll(
    onlyApproved = false,
    options?: { specialization?: string },
  ): Promise<DoctorEntity[]> {
    const filter: Record<string, unknown> = {};
    if (onlyApproved) {
      filter.isApproved = true;
    }
    const spec = options?.specialization?.trim();
    if (spec) {
      filter.specialization = {
        $regex: escapeRegex(spec),
        $options: 'i',
      };
    }
    const docs = await this.doctorModel.find(filter).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<DoctorEntity | null> {
    const doc = await this.doctorModel.findById(id).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByUserId(userId: string): Promise<DoctorEntity | null> {
    const doc = await this.doctorModel.findOne({ userId }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<DoctorEntity | null> {
    const doc = await this.doctorModel.findOne({ email }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async create(data: Partial<DoctorEntity>): Promise<DoctorEntity> {
    const created = new this.doctorModel(data);
    const saved = await created.save();
    return this.toEntity(saved);
  }

  async update(
    id: string,
    data: Partial<DoctorEntity>,
  ): Promise<DoctorEntity | null> {
    const doc = await this.doctorModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.doctorModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
