import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { AppointmentValidationService } from '../services/appointment-validation.service';
import { CreateAppointmentDto } from '../dtos/create-appointment.dto';

@Injectable()
export class BookAppointmentUseCase {
  private readonly logger = new Logger(BookAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly doctorClient: DoctorClient,
    private readonly validationService: AppointmentValidationService,
  ) {}

  async execute(
    dto: CreateAppointmentDto,
    patientId: string,
    role: UserRole,
  ): Promise<Appointment> {
    if (role !== UserRole.PATIENT) {
      throw new ForbiddenException('Only patients can book appointments.');
    }

    const slotStart = new Date(dto.slotStart);

    // 1. Reusable Validation (Boundary + Availability + Conflict)
    await this.validationService.validateBooking(dto.doctorId, patientId, slotStart);

    // 2. Initial Creation (Always starts as PENDING)
    const newAppointment = await this.appointmentRepository.create({
      patientId,
      doctorId: dto.doctorId,
      slotStart,
      status: AppointmentStatus.PENDING,
      reasonForVisit: dto.reasonForVisit,
      telemedicineLinkDoctor: undefined,
      telemedicineLinkPatient: undefined,
      paymentStatus: 'PENDING',
    });


    this.logger.log(
      `Appointment ${newAppointment.id} booked (PENDING) — patient: ${patientId}, doctor: ${dto.doctorId}`,
    );

    // TODO: Implement Notification Service call to notify patient/doctor that a PENDING booking intent was created.
    
    return newAppointment;
  }
}
