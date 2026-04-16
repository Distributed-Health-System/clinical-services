import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import twilio from 'twilio';
import { CreateNotificationDto } from '../dtos/create-notification.dto';

type EmailSent = {
  channel: 'email';
  to: string;
  id: string | null;
  role: 'patient' | 'doctor';
};

type SmsSent = {
  channel: 'sms';
  to: string;
  sid: string | null;
  role: 'patient' | 'doctor';
};

@Injectable()
export class NotificationService {
  private readonly resend: Resend;
  private readonly emailFrom: string;
  private readonly twilioClient: ReturnType<typeof twilio> | null;
  private readonly twilioFrom: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('resend.apiKey')?.trim();
    this.emailFrom = this.config.get<string>('resend.emailFrom')?.trim() ?? '';

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Missing RESEND_API_KEY in notification-service environment.',
      );
    }

    if (!this.emailFrom) {
      throw new ServiceUnavailableException(
        'Missing EMAIL_FROM in notification-service environment.',
      );
    }

    this.resend = new Resend(apiKey);

    const twSid = this.config.get<string>('twilio.accountSid')?.trim();
    const twToken = this.config.get<string>('twilio.authToken')?.trim();
    const twFrom = this.config.get<string>('twilio.phoneNumber')?.trim();

    if (twSid && twToken && twFrom) {
      this.twilioClient = twilio(twSid, twToken);
      this.twilioFrom = twFrom;
    } else {
      this.twilioClient = null;
      this.twilioFrom = '';
    }
  }

  async sendAppointmentConfirmed(payload: CreateNotificationDto): Promise<{
    ok: boolean;
    email: { sent: EmailSent[] };
    sms: {
      sent: SmsSent[];
      skipped?: 'twilio_not_configured' | 'no_recipient_phone_numbers';
    };
  }> {
    const email = await this.sendAppointmentConfirmedEmails(payload);
    const sms = await this.sendAppointmentConfirmedSms(payload);
    return { ok: true, email, sms };
  }

  private async sendAppointmentConfirmedEmails(
    payload: CreateNotificationDto,
  ): Promise<{ sent: EmailSent[] }> {
    const sent: EmailSent[] = [];

    const recipients: Array<{
      role: 'patient' | 'doctor';
      email: string;
      name?: string;
      counterpartName?: string;
    }> = [
      {
        role: 'patient',
        email: payload.patientEmail,
        name: payload.patientName,
        counterpartName: payload.doctorName,
      },
    ];

    if (payload.doctorEmail?.trim()) {
      recipients.push({
        role: 'doctor',
        email: payload.doctorEmail,
        name: payload.doctorName,
        counterpartName: payload.patientName,
      });
    }

    for (const recipient of recipients) {
      const subject =
        recipient.role === 'patient'
          ? 'Appointment Confirmed'
          : 'Appointment Confirmation Received';

      const html = this.buildAppointmentConfirmedHtml(payload, recipient);
      const text = this.buildAppointmentConfirmedText(payload, recipient);

      try {
        const result = await this.resend.emails.send({
          from: this.emailFrom,
          to: recipient.email,
          subject,
          html,
          text,
        });

        sent.push({
          channel: 'email',
          to: recipient.email,
          id: result.data?.id ?? null,
          role: recipient.role,
        });
      } catch {
        throw new InternalServerErrorException(
          `Failed to send ${recipient.role} email via Resend.`,
        );
      }
    }

    return { sent };
  }

  private async sendAppointmentConfirmedSms(
    payload: CreateNotificationDto,
  ): Promise<{
    sent: SmsSent[];
    skipped?: 'twilio_not_configured' | 'no_recipient_phone_numbers';
  }> {
    if (!this.twilioClient || !this.twilioFrom) {
      return { sent: [], skipped: 'twilio_not_configured' };
    }

    const recipients: Array<{
      role: 'patient' | 'doctor';
      phone: string;
      name?: string;
      counterpartName?: string;
    }> = [];

    if (payload.patientPhone?.trim()) {
      recipients.push({
        role: 'patient',
        phone: payload.patientPhone.trim(),
        name: payload.patientName,
        counterpartName: payload.doctorName,
      });
    }

    if (payload.doctorPhone?.trim()) {
      recipients.push({
        role: 'doctor',
        phone: payload.doctorPhone.trim(),
        name: payload.doctorName,
        counterpartName: payload.patientName,
      });
    }

    if (recipients.length === 0) {
      return { sent: [], skipped: 'no_recipient_phone_numbers' };
    }

    const sent: SmsSent[] = [];

    for (const recipient of recipients) {
      const body = this.buildAppointmentConfirmedSmsBody(payload, recipient);
      try {
        const msg = await this.twilioClient.messages.create({
          from: this.twilioFrom,
          to: recipient.phone,
          body,
        });
        sent.push({
          channel: 'sms',
          to: recipient.phone,
          sid: msg.sid ?? null,
          role: recipient.role,
        });
      } catch {
        throw new InternalServerErrorException(
          `Failed to send ${recipient.role} SMS via Twilio.`,
        );
      }
    }

    return { sent };
  }

  private buildAppointmentConfirmedSmsBody(
    payload: CreateNotificationDto,
    recipient: {
      role: 'patient' | 'doctor';
      name?: string;
      counterpartName?: string;
    },
  ): string {
    const formattedDate = new Date(payload.startsAt).toUTCString();
    const who =
      recipient.role === 'patient'
        ? recipient.counterpartName
          ? `Dr. ${recipient.counterpartName}`
          : 'your doctor'
        : recipient.counterpartName ?? 'your patient';
    const greeting = recipient.name ? `Hi ${recipient.name}, ` : '';
    const line =
      recipient.role === 'patient'
        ? `Your appointment with ${who} is confirmed.`
        : `Appointment with ${who} is confirmed.`;
    const parts = [
      `${greeting}${line}`,
      `ID: ${payload.appointmentId}`,
      `Starts (UTC): ${formattedDate}`,
    ];
    if (payload.specialization?.trim()) {
      parts.push(`Spec: ${payload.specialization.trim()}`);
    }
    if (payload.meetingUrl?.trim()) {
      parts.push(`Join: ${payload.meetingUrl.trim()}`);
    }
    return parts.join(' ');
  }

  private buildAppointmentConfirmedHtml(
    payload: CreateNotificationDto,
    recipient: {
      role: 'patient' | 'doctor';
      name?: string;
      counterpartName?: string;
    },
  ): string {
    const formattedDate = new Date(payload.startsAt).toUTCString();
    const greeting = recipient.name ? `Hi ${recipient.name},` : 'Hello,';
    const roleSpecific =
      recipient.role === 'patient'
        ? `Your appointment${recipient.counterpartName ? ` with Dr. ${recipient.counterpartName}` : ''} is now confirmed.`
        : `Your appointment${recipient.counterpartName ? ` with ${recipient.counterpartName}` : ''} is now confirmed.`;
    const meetingLine = payload.meetingUrl
      ? `<p><strong>Meeting link:</strong> <a href="${payload.meetingUrl}">${payload.meetingUrl}</a></p>`
      : '';
    const specializationLine = payload.specialization
      ? `<p><strong>Specialization:</strong> ${payload.specialization}</p>`
      : '';

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>${greeting}</p>
        <p>${roleSpecific}</p>
        <p><strong>Appointment ID:</strong> ${payload.appointmentId}</p>
        <p><strong>Starts at (UTC):</strong> ${formattedDate}</p>
        ${specializationLine}
        ${meetingLine}
        <p>Please keep this email for your records.</p>
      </div>
    `;
  }

  private buildAppointmentConfirmedText(
    payload: CreateNotificationDto,
    recipient: {
      role: 'patient' | 'doctor';
      name?: string;
      counterpartName?: string;
    },
  ): string {
    const formattedDate = new Date(payload.startsAt).toUTCString();
    const intro = recipient.name ? `Hi ${recipient.name},` : 'Hello,';
    const roleLine =
      recipient.role === 'patient'
        ? `Your appointment${recipient.counterpartName ? ` with Dr. ${recipient.counterpartName}` : ''} is confirmed.`
        : `Your appointment${recipient.counterpartName ? ` with ${recipient.counterpartName}` : ''} is confirmed.`;
    const specializationLine = payload.specialization
      ? `Specialization: ${payload.specialization}`
      : '';
    const meetingLine = payload.meetingUrl ? `Meeting link: ${payload.meetingUrl}` : '';

    return [
      intro,
      '',
      roleLine,
      `Appointment ID: ${payload.appointmentId}`,
      `Starts at (UTC): ${formattedDate}`,
      specializationLine,
      meetingLine,
      '',
      'Please keep this email for your records.',
    ]
      .filter(Boolean)
      .join('\n');
  }
}
