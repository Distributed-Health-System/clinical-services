import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { UserRole } from '../../domain/enums/user-role.enum';
import { SLOT_DURATION_MINUTES } from '../../domain/constants/appointment.constants';
import { PaymentClient } from '../../infrastructure/external/payment.client';
import { DoctorClient } from '../../infrastructure/external/doctor.client';
import { TelemedicineClient } from '../../infrastructure/external/telemedicine.client';
import { AppointmentValidationService } from '../services/appointment-validation.service';
import { CreateAppointmentDto } from '../dtos/create-appointment.dto';

@Injectable()
export class BookAppointmentUseCase {
  private readonly logger = new Logger(BookAppointmentUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly paymentClient: PaymentClient,
    private readonly doctorClient: DoctorClient,
    private readonly telemedicineClient: TelemedicineClient,
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

    // 3. Payment Gating for Automated Confirmation
    try {
      const paymentStatus = await this.paymentClient.confirmPayment(newAppointment.id);
      
      if (paymentStatus === 'CONFIRMED') {
        // AUTOMATED CONFIRMATION FLOW
        // If payment is successful, we skip manual doctor approval.
        const links = await this.telemedicineClient.generateLink(newAppointment.id);
        
        const updated = await this.appointmentRepository.updateStatus(
          newAppointment.id,
          AppointmentStatus.CONFIRMED,
          links.doctorLink,
          links.patientLink,
        );

        if (updated) {
          this.logger.log(`Appointment ${newAppointment.id} AUTO-CONFIRMED via payment.`);
          return updated;
        }
      } else if (paymentStatus !== 'PENDING') {
        // If payment failed or has another status, update the record
        await this.appointmentRepository.update(newAppointment.id, { paymentStatus });
        newAppointment.paymentStatus = paymentStatus;
      }
    } catch (error) {
      this.logger.warn(
        `Automated confirmation failed for appointment ${newAppointment.id}: ${error.message}`,
      );
    }

    this.logger.log(
      `Appointment ${newAppointment.id} booked (PENDING) — patient: ${patientId}, doctor: ${dto.doctorId}`,
    );
    return newAppointment;
  }
}
