import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Patient, PatientDocument } from '../schemas/patient.schema';

/**
 * Placeholder Mongo repository implementation for Patient.
 */
@Injectable()
export class MongoPatientRepository {
  constructor(
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument>,
  ) {}
}
