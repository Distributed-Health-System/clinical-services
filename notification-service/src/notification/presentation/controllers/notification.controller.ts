import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from '../../application/services/notification.service';
import { CreateNotificationDto } from '../../application/dtos/create-notification.dto';
import { ServiceOrGatewayAuthGuard } from '../../../common/guards/service-or-gateway-auth.guard';

@Controller('notifications')
@UseGuards(ServiceOrGatewayAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('appointment-confirmed')
  sendAppointmentConfirmed(@Body() body: CreateNotificationDto) {
    return this.notificationService.sendAppointmentConfirmed(body);
  }
}
