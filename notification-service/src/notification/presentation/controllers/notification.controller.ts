import { Controller } from '@nestjs/common';
import { NotificationService } from '../../application/services/notification.service';

/**
 * Placeholder controller for Notification.
 */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}
}
