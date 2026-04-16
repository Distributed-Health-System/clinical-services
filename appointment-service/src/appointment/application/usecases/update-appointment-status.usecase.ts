import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { TelemedicineClient } from '../../infrastructure/external/telemedicine.client';
import { UpdateAppointmentStatusDto } from '../dtos/update-appointment-status.dto';

@Injectable()
export class UpdateAppointmentStatusUseCase {
  private readonly logger = new Logger(UpdateAppointmentStatusUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly telemedicineClient: TelemedicineClient,
  ) {}

  async execute(
    id: string,
    dto: UpdateAppointmentStatusDto,
    userId: string,
    role: UserRole,
  ): Promise<Appointment> {
    if (role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Only doctors can accept or reject appointments.');
    }

    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found.`);
    }

    if (appointment.doctorId !== userId) {
      throw new ForbiddenException('This appointment is not assigned to you.');
    }

    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update status of an appointment that is '${appointment.status}'. ` +
          `Only PENDING appointments can be accepted or rejected.`,
      );
    }

    if (
      dto.status !== AppointmentStatus.CONFIRMED &&
      dto.status !== AppointmentStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Doctors can only set status to CONFIRMED or REJECTED. Received: '${dto.status}'.`,
      );
    }

    let telemedicineLink: string | undefined;
    if (dto.status === AppointmentStatus.CONFIRMED) {
      telemedicineLink = await this.telemedicineClient.generateLink(appointment.id);
      this.logger.log(
        `Telemedicine link generated for appointment ${id}: ${telemedicineLink}`,
      );
    }

    const updated = await this.appointmentRepository.updateStatus(
      id,
      dto.status,
      telemedicineLink,
    );
    if (!updated) {
      throw new NotFoundException(`Appointment ${id} could not be updated.`);
    }

    this.logger.log(
      `Appointment ${id} status → ${dto.status} by doctor ${userId}.`,
    );
    return updated;
  }
}
