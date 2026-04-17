import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { APPOINTMENT_REPOSITORY } from '../../domain/repositories/appointment.repository.interface';
import type { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';
import { AppointmentStatus } from '../../domain/enums/appointment-status.enum';
import { TelemedicineClient } from '../../infrastructure/external/telemedicine.client';
import { PaymentWebhookDto, WebhookPaymentStatus } from '../dtos/payment-webhook.dto';

@Injectable()
export class ProcessPaymentWebhookUseCase {
  private readonly logger = new Logger(ProcessPaymentWebhookUseCase.name);

  constructor(
    @Inject(APPOINTMENT_REPOSITORY)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly telemedicineClient: TelemedicineClient,
  ) {}

  async execute(dto: PaymentWebhookDto): Promise<void> {
    const { appointmentId, status, transactionId } = dto;
    
    this.logger.log(`Received payment webhook for appointment ${appointmentId}: status=${status}, tx=${transactionId}`);

    const appointment = await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      this.logger.error(`Webhook failed: Appointment ${appointmentId} not found.`);
      throw new NotFoundException(`Appointment ${appointmentId} not found.`);
    }

    // Only process if it's currently PENDING. If it's already CONFIRMED, or CANCELLED, ignore.
    if (appointment.status !== AppointmentStatus.PENDING) {
      this.logger.warn(`Webhook ignored: Appointment ${appointmentId} is not in PENDING state (current: ${appointment.status}).`);
      return;
    }

    if (status === WebhookPaymentStatus.CONFIRMED) {
      // 1. Generate Telemedicine Links
      let doctorLink: string | undefined;
      let patientLink: string | undefined;
      
      try {
        const links = await this.telemedicineClient.generateLink(appointment.id);
        doctorLink = links.doctorLink;
        patientLink = links.patientLink;
      } catch (error) {
        this.logger.error(`Telemedicine link generation failed for appointment ${appointment.id}: ${error.message}`);
        // We might still want to confirm the payment and status, and let links be generated later/retried,
        // but for now we follow the optimistic path.
      }

      // 2. Update Appointment Status and Payment info
      await this.appointmentRepository.update(appointment.id, {
        paymentStatus: 'CONFIRMED',
        paymentTransactionId: transactionId,
      });

      await this.appointmentRepository.updateStatus(
        appointment.id,
        AppointmentStatus.CONFIRMED,
        doctorLink,
        patientLink,
      );

      this.logger.log(`Appointment ${appointmentId} successfully CONFIRMED via webhook.`);

      // TODO: Implement Notification Service call to notify both doctor and patient that the appointment is fully CONFIRMED.


    } else if (status === WebhookPaymentStatus.FAILED) {
      // Update payment status but leave the appointment overall status as PENDING (or cancel it depending on biz logic, sticking to PENDING)
      await this.appointmentRepository.update(appointment.id, {
        paymentStatus: 'FAILED',
        paymentTransactionId: transactionId,
      });
      
      this.logger.log(`Appointment ${appointmentId} payment FAILED via webhook. Status remains PENDING.`);

      // TODO: Implement Notification Service call to alert the patient that their payment failed and requires action.
    }
  }
}
