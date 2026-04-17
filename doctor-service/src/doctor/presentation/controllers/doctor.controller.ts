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
import {
  CreateDoctorProfileImageUploadIntentDto,
  FinalizeDoctorProfileImageUploadDto,
} from '../../application/dtos/doctor-profile-image.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';

@Controller('doctors')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // Public — doctor self-registers, no token required
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorService.create(dto);
  }

  // Public — anyone can browse the approved doctor list
  @Get()
  findAll(@Query('specialization') specialization?: string) {
    return this.doctorService.findAll(specialization);
  }

  // Authenticated doctor — fetch own doctor profile
  @Get('me')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('doctor')
  findMe(@Req() req: Request) {
    return this.doctorService.getMyProfile(req['userId']);
  }

  // Any authenticated user — unapproved profiles hidden unless own or admin
  @Get(':id')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.doctorService.findById(id, req['userId'], req['userRole']);
  }

  // Authenticated doctor — create signed upload URL for profile image
  @Post('me/profile-image/upload-intent')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('doctor')
  createMyProfileImageUploadIntent(
    @Req() req: Request,
    @Body() dto: CreateDoctorProfileImageUploadIntentDto,
  ) {
    return this.doctorService.createMyProfileImageUploadIntent(req['userId'], dto);
  }

  // Authenticated doctor — finalize uploaded profile image
  @Post('me/profile-image/finalize')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('doctor')
  finalizeMyProfileImageUpload(
    @Req() req: Request,
    @Body() dto: FinalizeDoctorProfileImageUploadDto,
  ) {
    return this.doctorService.finalizeMyProfileImageUpload(req['userId'], dto);
  }

  // Authenticated doctor — get signed download URL for current profile image
  @Get('me/profile-image/download-url')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('doctor')
  getMyProfileImageDownloadUrl(@Req() req: Request) {
    return this.doctorService.getMyProfileImageDownloadUrl(req['userId']);
  }

  // Authenticated doctor — delete current profile image
  @Delete('me/profile-image')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('doctor')
  deleteMyProfileImage(@Req() req: Request) {
    return this.doctorService.deleteMyProfileImage(req['userId']);
  }

  // Doctor edits own profile, or admin edits any
  @Patch(':id')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
    @Req() req: Request,
  ) {
    return this.doctorService.update(id, dto, req['userId'], req['userRole']);
  }

  // Admin approves a doctor registration
  @Patch(':id/approve')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('admin')
  approve(@Param('id') id: string) {
    return this.doctorService.approve(id);
  }

  // Admin rejects a doctor registration — deletes the record
  @Patch(':id/reject')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(@Param('id') id: string) {
    return this.doctorService.reject(id);
  }

  // Admin only
  @Delete(':id')
  @UseGuards(GatewayAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.doctorService.delete(id);
  }
}
