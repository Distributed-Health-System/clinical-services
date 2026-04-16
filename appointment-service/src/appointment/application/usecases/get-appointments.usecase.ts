import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentTimeFilter } from '../../domain/enums/appointment-time-filter.enum';
import { UserRole } from '../../domain/enums/user-role.enum';

@Injectable()
export class GetAppointmentsUseCase {
  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
  ) {}

  async execute(
    userId: string,
    role: UserRole,
    timeFilter?: AppointmentTimeFilter,
  ): Promise<Appointment[]> {
    switch (role) {
      case UserRole.ADMIN:
        return this.appointmentRepository.findAll();
      case UserRole.PATIENT:
        return this.appointmentRepository.findByPatientId(userId, timeFilter);
      case UserRole.DOCTOR:
        return this.appointmentRepository.findByDoctorId(userId, timeFilter);
      default:
        throw new ForbiddenException('Unknown role — cannot retrieve appointments.');
    }
  }
}
