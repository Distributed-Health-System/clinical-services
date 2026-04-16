import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import configuration from './config/configuration';
import { PatientModule } from './patient/patient.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: join(__dirname, '..', '.env'),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('mongodb.uri');
        if (!uri?.trim()) {
          throw new Error(
            'MONGODB_URI is missing or empty. Set it in patient-service/.env and restart.',
          );
        }
        return { uri };
      },
      inject: [ConfigService],
    }),
    PatientModule,
  ],
})
export class AppModule {}
