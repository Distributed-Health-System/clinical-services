import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AvailabilityService } from '../../application/services/availability.service';
import { PutAvailabilityScheduleDto } from '../../application/dtos/put-availability-schedule.dto';
import { PatchAvailabilityScheduleDto } from '../../application/dtos/patch-availability-schedule.dto';
import { DateOverrideDto } from '../../application/dtos/date-override.dto';
import { GatewayAuthGuard } from '../../../doctor/presentation/guards/gateway-auth.guard';
import { RolesGuard } from '../../../doctor/presentation/guards/roles.guard';
import { Roles } from '../../../doctor/presentation/decorators/roles.decorator';

@Controller('doctors/me/availability')
@UseGuards(GatewayAuthGuard, RolesGuard)
@Roles('doctor')
export class DoctorMeAvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  async getMy(@Req() req: Request) {
    const schedule = await this.availabilityService.getMy(
      req['userId'] as string,
    );
    return { schedule };
  }

  @Put()
  putMy(@Req() req: Request, @Body() dto: PutAvailabilityScheduleDto) {
    return this.availabilityService.putMy(req['userId'] as string, dto);
  }

  @Patch()
  patchMy(@Req() req: Request, @Body() dto: PatchAvailabilityScheduleDto) {
    return this.availabilityService.patchMy(req['userId'] as string, dto);
  }

  @Post('overrides')
  addOverride(@Req() req: Request, @Body() dto: DateOverrideDto) {
    return this.availabilityService.addOverride(req['userId'] as string, dto);
  }

  @Delete('overrides/:date')
  removeOverride(@Req() req: Request, @Param('date') date: string) {
    return this.availabilityService.removeOverride(
      req['userId'] as string,
      date,
    );
  }
}
