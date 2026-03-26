import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelemedicineSession, TelemedicineDocument } from '../schemas/telemedicine.schema';

/**
 * Placeholder Mongo repository implementation for Telemedicine.
 */
@Injectable()
export class MongoTelemedicineRepository {
  constructor(
    @InjectModel(TelemedicineSession.name) private readonly telemedicineModel: Model<TelemedicineDocument>,
  ) {}
}
