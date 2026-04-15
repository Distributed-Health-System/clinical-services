import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
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
import { AuthGuard } from '../guards/auth.guard';
import type { AuthenticatedRequest } from '../guards/auth.guard';
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
@UseGuards(AuthGuard)
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentService.bookAppointment(dto, req.user.userId, req.user.role);
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
    @Req() req: AuthenticatedRequest,
    @Query('filter') timeFilter?: AppointmentTimeFilter,
  ) {
    // Validate the filter query param if provided
    const validFilters = Object.values(AppointmentTimeFilter) as string[];
    const resolvedFilter =
      timeFilter && validFilters.includes(timeFilter) ? timeFilter : undefined;

    return this.appointmentService.getAppointments(
      req.user.userId,
      req.user.role,
      resolvedFilter,
    );
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentService.getAppointmentById(id, req.user.userId, req.user.role);
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentService.updateStatus(id, dto, req.user.userId, req.user.role);
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
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appointmentService.updateAppointment(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }
}
