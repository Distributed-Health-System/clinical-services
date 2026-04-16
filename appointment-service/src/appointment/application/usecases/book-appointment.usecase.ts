import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';
import { PaymentClient } from '../../infrastructure/external/payment.client';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { CreateAppointmentDto } from '../dtos/create-appointment.dto';

@Injectable()
export class BookAppointmentUseCase {
  private readonly logger = new Logger(BookAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly paymentClient: PaymentClient,
    private readonly doctorClient: DoctorClient,
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
    this._validateSlotDate(slotStart);

    const slotValidation = await this.doctorClient.validateSlot(
      dto.doctorId,
      slotStart,
    );
    if (!slotValidation.valid) {
      throw new BadRequestException(
        `This time slot is not available: ${
          slotValidation.reason ?? 'outside doctor availability.'
        }`,
      );
    }

    const [doctorConflict, patientConflict] = await Promise.all([
      this.appointmentRepository.hasSlotConflictForDoctor(dto.doctorId, slotStart),
      this.appointmentRepository.hasSlotConflictForPatient(patientId, slotStart),
    ]);

    if (doctorConflict) {
      throw new ConflictException(
        `Doctor ${dto.doctorId} already has a booking in this time slot. Please choose a different slot.`,
      );
    }
    if (patientConflict) {
      throw new ConflictException(
        'You already have an appointment in this time slot. Please choose a different slot.',
      );
    }

    const newAppointment = await this.appointmentRepository.create({
      patientId,
      doctorId: dto.doctorId,
      slotStart,
      status: AppointmentStatus.PENDING,
      reasonForVisit: dto.reasonForVisit,
      telemedicineLink: undefined,
      paymentStatus: 'PENDING',
    });

    try {
      const paymentStatus = await this.paymentClient.confirmPayment(newAppointment.id);
      if (paymentStatus !== 'PENDING') {
        await this.appointmentRepository.update(newAppointment.id, { paymentStatus });
        newAppointment.paymentStatus = paymentStatus;
      }
    } catch {
      this.logger.warn(
        `Payment confirmation silently failed for appointment ${newAppointment.id}. Status remains PENDING.`,
      );
    }

    this.logger.log(
      `Appointment ${newAppointment.id} booked — patient: ${patientId}, doctor: ${dto.doctorId}, slot: ${slotStart.toISOString()}`,
    );
    return newAppointment;
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
