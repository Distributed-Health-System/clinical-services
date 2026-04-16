import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';

@Injectable()
export class AppointmentValidationService {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly doctorClient: DoctorClient,
  ) {}

  /**
   * Validates both business rules (doctor availability) and technical rules (conflicts).
   */
  async validateBooking(
    doctorId: string,
    patientId: string,
    slotStart: Date,
  ): Promise<void> {
    // 1. Technical Boundary Validation
    this.validateSlotDate(slotStart);

    // 2. Doctor Availability Validation (External Service call)
    const slotValidation = await this.doctorClient.validateSlot(doctorId, slotStart);
    if (!slotValidation.valid) {
      throw new BadRequestException(
        `This time slot is not available: ${
          slotValidation.reason ?? 'outside doctor availability.'
        }`,
      );
    }

    // 3. Conflict Validation (Internal Database checks)
    const [doctorConflict, patientConflict] = await Promise.all([
      this.appointmentRepository.hasSlotConflictForDoctor(doctorId, slotStart),
      this.appointmentRepository.hasSlotConflictForPatient(patientId, slotStart),
    ]);

    if (doctorConflict) {
      throw new ConflictException(
        `Doctor ${doctorId} already has a booking in this time slot.`,
      );
    }
    if (patientConflict) {
      throw new ConflictException(
        'You already have an appointment in this time slot.',
      );
    }
  }

  /**
   * Ensures the date is in the future and aligns to slot boundaries.
   */
  validateSlotDate(slotStart: Date): void {
    if (isNaN(slotStart.getTime())) {
      throw new BadRequestException('Invalid date provided for slotStart.');
    }
    if (slotStart <= new Date()) {
      throw new BadRequestException('Appointment slot must be in the future.');
    }
    const validMinutes = [0, 60 - SLOT_DURATION_MINUTES];
    const minutes = slotStart.getUTCMinutes();
    if (!validMinutes.includes(minutes)) {
      throw new BadRequestException(
        `Slot start must align to a ${SLOT_DURATION_MINUTES}-minute boundary (:00 or :30 UTC).`,
      );
    }
  }
}
