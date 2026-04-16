import {
  Body,
  Controller,
  Delete,
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
import type { Request } from 'express';
import { DoctorService } from '../../application/services/doctor.service';
import { CreateDoctorDto } from '../../application/dtos/create-doctor.dto';
import { UpdateDoctorDto } from '../../application/dtos/update-doctor.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('doctors')
@UseGuards(GatewayAuthGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // Any authenticated user — patients browse approved doctors
  @Get()
  findAll(@Query('specialization') specialization?: string) {
    return this.doctorService.findAll(specialization);
  }

  // Any authenticated user — unapproved profiles hidden unless own or admin
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.doctorService.findById(id, req['userId'], req['userRole']);
  }

  // Public — doctor self-registers, no token required
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards()
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorService.create(dto);
  }

  // Doctor edits own profile, or admin edits any
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
    @Req() req: Request,
  ) {
    return this.doctorService.update(id, dto, req['userId'], req['userRole']);
  }

  // Admin approves a doctor registration
  @Patch(':id/approve')
  @Roles('admin')
  approve(@Param('id') id: string) {
    return this.doctorService.approve(id);
  }

  // Admin rejects a doctor registration — deletes the record
  @Patch(':id/reject')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(@Param('id') id: string) {
    return this.doctorService.reject(id);
  }

  // Admin only
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.doctorService.delete(id);
  }
}
