import { Appointment } from '../../domain/entities/appointment.entity';
import { UserRole } from '../../domain/enums/user-role.enum';
import { AppointmentResponseDto } from '../dtos/appointment-response.dto';

function normalizeRole(role: UserRole | string): string {
  return String(role).toUpperCase();
}

export function toAppointmentResponse(
  appointment: Appointment,
  role: UserRole | string,
): AppointmentResponseDto {
  const normalizedRole = normalizeRole(role);

  const response: AppointmentResponseDto = {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    slotStart: appointment.slotStart,
    status: appointment.status,
    reasonForVisit: appointment.reasonForVisit,
    paymentStatus: appointment.paymentStatus,
    paymentTransactionId: appointment.paymentTransactionId,
  };

  if (normalizedRole === UserRole.ADMIN) {
    response.telemedicineLinkDoctor = appointment.telemedicineLinkDoctor;
    response.telemedicineLinkPatient = appointment.telemedicineLinkPatient;
    return response;
  }

  if (normalizedRole === UserRole.DOCTOR) {
    response.telemedicineLinkDoctor = appointment.telemedicineLinkDoctor;
    return response;
  }

  if (normalizedRole === UserRole.PATIENT) {
    response.telemedicineLinkPatient = appointment.telemedicineLinkPatient;
    return response;
  }

  // Unknown role: return safe base payload with no telemedicine links.
  return response;
}

export function toAppointmentResponseList(
  appointments: Appointment[],
  role: UserRole | string,
): AppointmentResponseDto[] {
  return appointments.map((appointment) =>
    toAppointmentResponse(appointment, role),
  );
}
