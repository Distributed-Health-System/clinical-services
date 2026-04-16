import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import configuration from './config/configuration';
import { DoctorModule } from './doctor/doctor.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { AvailabilityModule } from './availability/availability.module';
import { PatientProxyModule } from './patient-proxy/patient-proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Load .env from this package root even when Node cwd is elsewhere (e.g. monorepo root).
      // __dirname is dist/ at runtime → parent is doctor-service/
      envFilePath: join(__dirname, '..', '.env'),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('mongodb.uri');
        if (!uri?.trim()) {
          throw new Error(
            'MONGODB_URI is missing or empty. Set it in doctor-service/.env and restart.',
          );
        }
        return { uri };
      },
      inject: [ConfigService],
    }),
    DoctorModule,
    PrescriptionModule,
    AvailabilityModule,
    PatientProxyModule,
  ],
})
export class AppModule {}
