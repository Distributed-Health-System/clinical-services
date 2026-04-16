import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorModule } from '../doctor/doctor.module';
import {
  AvailabilityScheduleSchema,
  AvailabilityScheduleSchemaClass,
} from './infrastructure/database/mongo/schemas/availability-schedule.schema';
import { MongoAvailabilityScheduleRepository } from './infrastructure/database/mongo/repositories/mongo-availability-schedule.repository';
import { AVAILABILITY_SCHEDULE_REPOSITORY } from './domain/repositories/availability-schedule.repository.interface';
import { AvailabilityService } from './application/services/availability.service';
import { DoctorMeAvailabilityController } from './presentation/controllers/doctor-me-availability.controller';
import { AvailabilityIntegrationController } from './presentation/controllers/availability-integration.controller';
import { ServiceOrGatewayAuthGuard } from '../common/guards/service-or-gateway-auth.guard';

@Module({
  imports: [
    DoctorModule,
    MongooseModule.forFeature([
      {
        name: AvailabilityScheduleSchemaClass.name,
        schema: AvailabilityScheduleSchema,
      },
    ]),
  ],
  controllers: [
    DoctorMeAvailabilityController,
    AvailabilityIntegrationController,
  ],
  providers: [
    AvailabilityService,
    ServiceOrGatewayAuthGuard,
    {
      provide: AVAILABILITY_SCHEDULE_REPOSITORY,
      useClass: MongoAvailabilityScheduleRepository,
    },
  ],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
