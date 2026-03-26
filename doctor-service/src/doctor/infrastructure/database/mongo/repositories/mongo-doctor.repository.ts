import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from '../schemas/doctor.schema';

/**
 * Placeholder Mongo repository implementation for Doctor.
 */
@Injectable()
export class MongoDoctorRepository {
  constructor(
    @InjectModel(Doctor.name) private readonly doctorModel: Model<DoctorDocument>,
  ) {}
}
