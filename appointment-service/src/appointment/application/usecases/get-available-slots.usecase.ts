import { BadRequestException, Injectable } from '@nestjs/common';
import { DoctorClient } from '../../infrastructure/external/doctor.client';

@Injectable()
export class GetAvailableSlotsUseCase {
  constructor(private readonly doctorClient: DoctorClient) {}

  async execute(
    doctorId: string,
    from: string,
    to: string,
  ): Promise<string[]> {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException(
        'Query params "from" and "to" must be valid ISO 8601 date-time strings.',
      );
    }
    if (fromDate >= toDate) {
      throw new BadRequestException('"from" must be earlier than "to".');
    }

    return this.doctorClient.getFreeSlots(doctorId, fromDate, toDate);
  }
}
