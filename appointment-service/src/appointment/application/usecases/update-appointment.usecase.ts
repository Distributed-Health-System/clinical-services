import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { UpdateAppointmentDto } from '../dtos/update-appointment.dto';

@Injectable()
export class UpdateAppointmentUseCase {
  private readonly logger = new Logger(UpdateAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly doctorClient: DoctorClient,
  ) {}

  async execute(
    id: string,
    dto: UpdateAppointmentDto,
    userId: string,
    role: UserRole,
  ): Promise<Appointment> {
    if (role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can modify appointment details.');
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found.`);
    }

    if (appointment.patientId !== userId) {
      throw new ForbiddenException('You do not have access to this appointment.');
    }

    if (
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot modify an appointment with status '${appointment.status}'.`,
      );
    }

    const partial: Partial<Appointment> = {};

    if (dto.status === AppointmentStatus.CANCELLED) {
      partial.status = AppointmentStatus.CANCELLED;
    }

    if (dto.reasonForVisit) {
      partial.reasonForVisit = dto.reasonForVisit;
    }

    if (dto.slotStart) {
      const newSlotStart = new Date(dto.slotStart);
      this._validateSlotDate(newSlotStart);

      const slotValidation = await this.doctorClient.validateSlot(
        appointment.doctorId,
        newSlotStart,
      );
      if (!slotValidation.valid) {
        throw new BadRequestException(
          `The new time slot is not available: ${
            slotValidation.reason ?? 'outside doctor availability.'
          }`,
        );
      }

      const [doctorConflict, patientConflict] = await Promise.all([
        this.appointmentRepository.hasSlotConflictForDoctor(
          appointment.doctorId,
          newSlotStart,
        ),
        this.appointmentRepository.hasSlotConflictForPatient(userId, newSlotStart),
      ]);

      if (doctorConflict) {
        throw new ConflictException(
          `Doctor ${appointment.doctorId} already has a booking in the new time slot.`,
        );
      }
      if (patientConflict) {
        throw new ConflictException(
          'You already have an appointment in the new time slot.',
        );
      }

      partial.slotStart = newSlotStart;
      partial.status = AppointmentStatus.PENDING;
      partial.telemedicineLink = undefined;
    }

    if (Object.keys(partial).length === 0) {
      throw new BadRequestException(
        'No valid fields provided for update. Supply at least one of: status, reasonForVisit, slotStart.',
      );
    }

    const updated = await this.appointmentRepository.update(id, partial);
    if (!updated) {
      throw new NotFoundException(`Appointment ${id} could not be updated.`);
    }

    this.logger.log(
      `Appointment ${id} updated by patient ${userId}. Changes: ${JSON.stringify(partial)}`,
    );
    return updated;
  }

  private _validateSlotDate(slotStart: Date): void {
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
        `Slot start must align to a ${SLOT_DURATION_MINUTES}-minute boundary (:00 or :30 UTC). ` +
          `Received :${String(minutes).padStart(2, '0')} UTC.`,
      );
    }
  }
}
