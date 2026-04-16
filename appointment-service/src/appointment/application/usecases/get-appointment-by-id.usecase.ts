import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { UserRole } from '../../domain/enums/user-role.enum';

@Injectable()
export class GetAppointmentByIdUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(id: string, userId: string, role: UserRole): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found.`);
    }

    if (role === UserRole.PATIENT && appointment.patientId !== userId) {
      throw new ForbiddenException('You do not have access to this appointment.');
    }
    if (role === UserRole.DOCTOR && appointment.doctorId !== userId) {
      throw new ForbiddenException('This appointment is not assigned to you.');
    }

    return appointment;
  }
}
