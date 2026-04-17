import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
// import { Notification, NotificationSchema } from './infrastructure/database/mongo/schemas/notification.schema';
// import { MongoNotificationRepository } from './infrastructure/database/mongo/repositories/mongo-notification.repository';
import { NotificationService } from './application/services/notification.service';
import { NotificationController } from './presentation/controllers/notification.controller';
import { ServiceOrGatewayAuthGuard } from '../common/guards/service-or-gateway-auth.guard';

/**
 * Module definition for Notification.
 */
@Module({
  imports: [
    // MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    ServiceOrGatewayAuthGuard,
    // MongoNotificationRepository,
  ],
})
export class NotificationModule {}
