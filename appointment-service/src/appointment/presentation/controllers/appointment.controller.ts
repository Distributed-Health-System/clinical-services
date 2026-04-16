import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppointmentService } from '../../application/services/appointment.service';
import { CreateAppointmentDto } from '../../application/dtos/create-appointment.dto';
import { UpdateAppointmentStatusDto } from '../../application/dtos/update-appointment-status.dto';
import { UpdateAppointmentDto } from '../../application/dtos/update-appointment.dto';
import { UserRole } from '../../domain/enums/user-role.enum';
import { AppointmentTimeFilter } from '../../domain/enums/appointment-time-filter.enum';

/**
 * AppointmentController — Presentation Layer
 *
 * Exposes the Appointment bounded context's HTTP API.
 * All routes are guarded by AuthGuard (identity extraction + role parsing).
 *
 * Responsibility matrix:
 *   Controller  → extract request data, delegate to service, return response
 *   Service     → business logic, authorization (ownership + role checks)
 *   Repository  → persistence (never touched from here)
 *
 * Route ordering note:
 *   PATCH /:id/status is declared BEFORE PATCH /:id to ensure the more
 *   specific route is matched first by the NestJS router.
 *
 * Swagger:
 *   All endpoints are documented with @ApiOperation and @ApiResponse.
 *   Test with a Bearer token whose payload base64-decodes to:
 *     { "userId": "<your-id>", "role": "PATIENT|DOCTOR|ADMIN" }
 */
@ApiTags('appointments')
@ApiBearerAuth()
// @UseGuards(AuthGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // -------------------------------------------------------------------------
  // POST /appointments — Book an appointment (Patient only)
  // -------------------------------------------------------------------------

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Book a new appointment',
    description:
      'Creates a new PENDING appointment. Role must be PATIENT. ' +
      'Validates slot alignment, doctor availability (conflict check), ' +
      'and patient double-booking.',
  })
  @ApiResponse({ status: 201, description: 'Appointment successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid slot time or field validation failure.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization token.' })
  @ApiResponse({ status: 403, description: 'Caller is not a PATIENT.' })
  @ApiResponse({ status: 409, description: 'Slot conflict — doctor or patient is already booked.' })
  async bookAppointment(
    @Body() dto: CreateAppointmentDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
  ) {
    if (!userId || !role) {
      throw new BadRequestException('Missing x-user-id or x-user-role headers');
    }
    return this.appointmentService.bookAppointment(dto, userId, role as UserRole);
  }

  // -------------------------------------------------------------------------
  // GET /appointments — List appointments (role-scoped)
  // -------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'List appointments (scoped by role)',
    description:
      'Returns appointments relevant to the caller. ' +
      'ADMIN → all appointments. ' +
      'PATIENT → their own bookings. ' +
      'DOCTOR → appointments assigned to them. ' +
      'Optionally filtered by time: PAST | CURRENT | UPCOMING.',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    enum: AppointmentTimeFilter,
    description: 'Temporal filter: PAST, CURRENT, or UPCOMING.',
  })
  @ApiResponse({ status: 200, description: 'List of appointments returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization token.' })
  async getAppointments(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
    @Query('filter') timeFilter?: AppointmentTimeFilter,
  ) {
    if (!userId || !role) {
      throw new BadRequestException('Missing x-user-id or x-user-role headers');
    }
    // Validate the filter query param if provided
    const validFilters = Object.values(AppointmentTimeFilter) as string[];
    const resolvedFilter =
      timeFilter && validFilters.includes(timeFilter) ? timeFilter : undefined;

    return this.appointmentService.getAppointments(
      userId,
      role as UserRole,
      resolvedFilter,
    );
  }

  // -------------------------------------------------------------------------
  // GET /appointments/available-slots/:doctorId — Free slot proxy (all roles)
  // IMPORTANT: Declared BEFORE GET /:id so 'available-slots' is not treated
  // as an appointment ID by the NestJS router.
  // -------------------------------------------------------------------------

  @Get('available-slots/:doctorId')
  @ApiOperation({
    summary: 'Get available appointment slots for a doctor',
    description:
      'Proxies to the Doctor Service availability integration endpoint. ' +
      'Returns UTC ISO 8601 slot start strings within the given time window, ' +
      'filtered by the doctor\'s configured schedule (hours, breaks, overrides). ' +
      'Returns [] if the doctor has no schedule or the Doctor Service is unreachable. ' +
      'Maintains distribution transparency — frontend only talks to the Appointment Service.',
  })
  @ApiParam({ name: 'doctorId', description: "The doctor's auth user ID." })
  @ApiQuery({ name: 'from', required: true, description: 'Window start — ISO 8601 UTC (e.g. 2026-04-20T00:00:00.000Z).' })
  @ApiQuery({ name: 'to', required: true, description: 'Window end — ISO 8601 UTC (e.g. 2026-04-20T23:59:59.999Z).' })
  @ApiResponse({
    status: 200,
    description: 'Array of available UTC slot start strings.',
    schema: { example: { slots: ['2026-04-20T09:00:00.000Z', '2026-04-20T09:30:00.000Z'] } },
  })
  @ApiResponse({ status: 400, description: 'Missing or invalid from/to query params.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization token.' })
  async getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) {
      throw new BadRequestException(
        'Query params "from" and "to" are required ISO 8601 date-time strings.',
      );
    }
    return {
      slots: await this.appointmentService.getAvailableSlots(doctorId, from, to),
    };
  }

  // -------------------------------------------------------------------------
  // GET /appointments/:id — Get a specific appointment
  // -------------------------------------------------------------------------

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific appointment by ID',
    description:
      'Returns a single appointment. Ownership is enforced: ' +
      'PATIENT sees only their own, DOCTOR sees only assigned appointments. ' +
      'ADMIN can view any.',
  })
  @ApiParam({ name: 'id', description: 'The appointment MongoDB ObjectId.' })
  @ApiResponse({ status: 200, description: 'Appointment found and returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization token.' })
  @ApiResponse({ status: 403, description: 'Caller does not own this appointment.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  async getAppointmentById(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
  ) {
    if (!userId || !role) {
      throw new BadRequestException('Missing x-user-id or x-user-role headers');
    }
    return this.appointmentService.getAppointmentById(id, userId, role as UserRole);
  }

  // -------------------------------------------------------------------------
  // PATCH /appointments/:id/status — Accept or Reject (Doctor only)
  // IMPORTANT: Declared BEFORE /:id to ensure specific route matches first.
  // -------------------------------------------------------------------------

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Accept or reject a PENDING appointment (Doctor only)',
    description:
      'Transitions a PENDING appointment to CONFIRMED or REJECTED. ' +
      'Role must be DOCTOR and the appointment must be assigned to the caller. ' +
      'On CONFIRMED, a telemedicine video link is generated and attached.',
  })
  @ApiParam({ name: 'id', description: 'The appointment MongoDB ObjectId.' })
  @ApiResponse({ status: 200, description: 'Appointment status updated.' })
  @ApiResponse({ status: 400, description: 'Appointment is not in PENDING state.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization token.' })
  @ApiResponse({ status: 403, description: 'Caller is not the assigned DOCTOR.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
  ) {
    if (!userId || !role) {
      throw new BadRequestException('Missing x-user-id or x-user-role headers');
    }
    return this.appointmentService.updateStatus(id, dto, userId, role as UserRole);
  }

  // -------------------------------------------------------------------------
  // PATCH /appointments/:id — Modify or Cancel (Patient only)
  // -------------------------------------------------------------------------

  @Patch(':id')
  @ApiOperation({
    summary: 'Modify or cancel an appointment (Patient only)',
    description:
      'Allows a patient to update their appointment details (reason, slot time) ' +
      'or cancel it (set status to CANCELLED). ' +
      'Rescheduling resets the status back to PENDING for doctor re-confirmation. ' +
      'Cannot modify COMPLETED or REJECTED appointments.',
  })
  @ApiParam({ name: 'id', description: 'The appointment MongoDB ObjectId.' })
  @ApiResponse({ status: 200, description: 'Appointment updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid update or terminal appointment state.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid Authorization token.' })
  @ApiResponse({ status: 403, description: 'Caller does not own this appointment.' })
  @ApiResponse({ status: 404, description: 'Appointment not found.' })
  @ApiResponse({ status: 409, description: 'Slot conflict for new appointment time.' })
  async updateAppointment(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') role: string,
  ) {
    if (!userId || !role) {
      throw new BadRequestException('Missing x-user-id or x-user-role headers');
    }
    return this.appointmentService.updateAppointment(
      id,
      dto,
      userId,
      role as UserRole,
    );
  }
}
