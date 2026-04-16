import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { AppointmentValidationService } from '../services/appointment-validation.service';
import { UpdateAppointmentDto } from '../dtos/update-appointment.dto';

@Injectable()
export class UpdateAppointmentUseCase {
  private readonly logger = new Logger(UpdateAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly doctorClient: DoctorClient,
    private readonly validationService: AppointmentValidationService,
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

      // 1. Reusable Validation (Boundary + Availability + Conflict)
      await this.validationService.validateBooking(
        appointment.doctorId,
        userId,
        newSlotStart,
      );

      partial.slotStart = newSlotStart;
      partial.status = AppointmentStatus.PENDING;
      // Rescheduling requires re-confirmation (payment/auto) or manual,
      // so we clear existing links.
      partial.telemedicineLinkDoctor = undefined;
      partial.telemedicineLinkPatient = undefined;
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
}
