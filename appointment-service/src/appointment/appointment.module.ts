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
import { DoctorClient } from './infrastructure/external/doctor.client';

// --- Domain: DI Token ---
import { APPOINTMENT_REPOSITORY } from './domain/repositories/appointment.repository.interface';

// --- Application: UseCases ---
import { BookAppointmentUseCase } from './application/usecases/book-appointment.usecase';
import { GetAppointmentsUseCase } from './application/usecases/get-appointments.usecase';
import { GetAvailableSlotsUseCase } from './application/usecases/get-available-slots.usecase';
import { GetAppointmentByIdUseCase } from './application/usecases/get-appointment-by-id.usecase';
import { UpdateAppointmentStatusUseCase } from './application/usecases/update-appointment-status.usecase';
import { UpdateAppointmentUseCase } from './application/usecases/update-appointment.usecase';
import { AppointmentValidationService } from './application/services/appointment-validation.service';


// --- Presentation: Guard + Controller ---

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
    BookAppointmentUseCase,
    GetAppointmentsUseCase,
    GetAvailableSlotsUseCase,
    GetAppointmentByIdUseCase,
    UpdateAppointmentStatusUseCase,
    UpdateAppointmentUseCase,
    AppointmentValidationService,

    // --- Infrastructure: Repository (bound to domain interface token) ---
    {
      provide: APPOINTMENT_REPOSITORY,
      useClass: MongoAppointmentRepository,
    },

    // --- Infrastructure: External Clients ---
    TelemedicineClient,
    PaymentClient,
    DoctorClient,


  ],
})
export class AppointmentModule {}
