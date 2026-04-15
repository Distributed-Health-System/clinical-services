import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PatientDocument, PatientSchemaClass } from '../schemas/patient.schema';
import {
  IPatientRepository,
} from '../../../../domain/repositories/patient.repository.interface';
import {
  PatientEntity,
  PrescriptionRef,
  ReportRef,
} from '../../../../domain/entities/patient.entity';

@Injectable()
export class MongoPatientRepository implements IPatientRepository {
  constructor(
    @InjectModel(PatientSchemaClass.name)
    private readonly patientModel: Model<PatientDocument>,
  ) {}

  private toEntity(doc: PatientDocument): PatientEntity {
    const entity = new PatientEntity();
    entity.id = (doc._id as object).toString();
    entity.firstName = doc.firstName;
    entity.lastName = doc.lastName;
    entity.email = doc.email;
    entity.dateOfBirth = doc.dateOfBirth;
    entity.gender = doc.gender;
    entity.phone = doc.phone;
    entity.address = doc.address;
    entity.bloodGroup = doc.bloodGroup;
    entity.allergies = doc.allergies;
    entity.medicalHistory = doc.medicalHistory;
    entity.emergencyContactName = doc.emergencyContactName;
    entity.emergencyContactPhone = doc.emergencyContactPhone;
    entity.profileImageUrl = doc.profileImageUrl;
    entity.isActive = doc.isActive;
    entity.prescriptions = doc.prescriptions;
    entity.reports = doc.reports;
    entity.createdAt = doc.createdAt;
    entity.updatedAt = doc.updatedAt;
    return entity;
  }

  async findAll(): Promise<PatientEntity[]> {
    const docs = await this.patientModel.find({ isActive: true }).exec();
    return docs.map((d) => this.toEntity(d));
  }

  async findById(id: string): Promise<PatientEntity | null> {
    const doc = await this.patientModel.findOne({ _id: id, isActive: true }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findByEmail(email: string): Promise<PatientEntity | null> {
    const doc = await this.patientModel.findOne({ email, isActive: true }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async create(data: Partial<PatientEntity>): Promise<PatientEntity> {
    const created = new this.patientModel(data);
    const saved = await created.save();
    return this.toEntity(saved);
  }

  async update(
    id: string,
    data: Partial<PatientEntity>,
  ): Promise<PatientEntity | null> {
    const doc = await this.patientModel
      .findOneAndUpdate({ _id: id, isActive: true }, { $set: data }, { new: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.patientModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $set: { isActive: false } },
        { new: true },
      )
      .exec();
    return result !== null;
  }

  async addPrescription(
    id: string,
    prescription: PrescriptionRef,
  ): Promise<PatientEntity | null> {
    const doc = await this.patientModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $push: { prescriptions: prescription } },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async addReport(id: string, report: ReportRef): Promise<PatientEntity | null> {
    const doc = await this.patientModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $push: { reports: report } },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async removePrescription(
    id: string,
    prescriptionId: string,
  ): Promise<PatientEntity | null> {
    const doc = await this.patientModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $pull: { prescriptions: { id: prescriptionId } } },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async removeReport(id: string, reportId: string): Promise<PatientEntity | null> {
    const doc = await this.patientModel
      .findOneAndUpdate(
        { _id: id, isActive: true },
        { $pull: { reports: { id: reportId } } },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }
}
