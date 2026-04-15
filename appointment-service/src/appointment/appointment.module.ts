import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// --- Infrastructure: Schema ---
import {
  Appointment,
  AppointmentSchema,
} from './infrastructure/database/mongo/schemas/appointment.schema';

// --- Infrastructure: Repository Implementation ---
import { MongoAppointmentRepository } from './infrastructure/database/mongo/repositories/mongo-appointment.repository';

// --- Infrastructure: External Service Clients ---
import { TelemedicineClient } from './infrastructure/external/telemedicine.client';
import { PaymentClient } from './infrastructure/external/payment.client';

// --- Domain: DI Token ---
import { APPOINTMENT_REPOSITORY } from './domain/repositories/appointment.repository.interface';

// --- Application: Service ---
import { AppointmentService } from './application/services/appointment.service';

// --- Presentation: Guard + Controller ---
import { AuthGuard } from './presentation/guards/auth.guard';
import { AppointmentController } from './presentation/controllers/appointment.controller';

/**
 * AppointmentModule
 *
 * The NestJS module for the Appointment bounded context.
 * Wires all four DDD layers together via NestJS dependency injection.
 *
 * DI Token Binding:
 *   The repository interface (IAppointmentRepository) is bound to its
 *   Mongoose implementation via the APPOINTMENT_REPOSITORY token:
 *     provide:  APPOINTMENT_REPOSITORY (string constant from domain)
 *     useClass: MongoAppointmentRepository (infrastructure impl)
 *
 *   This means the AppointmentService receives the interface contract
 *   and remains completely decoupled from Mongoose — swapping the
 *   implementation (e.g., to Postgres) requires only changing this module.
 *
 * Guard Registration:
 *   AuthGuard is registered as a provider so NestJS can resolve it
 *   when @UseGuards(AuthGuard) is applied to the controller.
 */
@Module({
  imports: [
    // Register the Mongoose schema for the Appointment collection
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [AppointmentController],
  providers: [
    // --- Application Layer ---
    AppointmentService,

    // --- Infrastructure: Repository (bound to domain interface token) ---
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: MongoAppointmentRepository,
    },

    // --- Infrastructure: External Clients ---
    TelemedicineClient,
    PaymentClient,

    // --- Presentation: Guard ---
    AuthGuard,
  ],
})
export class AppointmentModule {}
