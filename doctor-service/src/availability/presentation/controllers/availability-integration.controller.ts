import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AvailabilityService } from '../../application/services/availability.service';
import { ValidateSlotDto } from '../../application/dtos/validate-slot.dto';
import { ServiceOrGatewayAuthGuard } from '../../../common/guards/service-or-gateway-auth.guard';

/**
 * Endpoints for appointment-service (or other backends) to query free slots
 * and validate a proposed slot against doctor availability.
 * Mounted under `/doctors/...` so the API gateway’s `/doctors` proxy forwards them.
 */
@Controller('doctors/integration/availability')
@UseGuards(ServiceOrGatewayAuthGuard)
export class AvailabilityIntegrationController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get(':doctorUserId/free-slots')
  getFreeSlots(
    @Param('doctorUserId') doctorUserId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.availabilityService.getFreeSlotsForDoctorUser(
      doctorUserId,
      from,
      to,
    );
  }

  @Post('validate-slot')
  validateSlot(@Body() dto: ValidateSlotDto) {
    return this.availabilityService.validateSlot(
      dto.doctorUserId,
      dto.slotStart,
    );
  }
}
