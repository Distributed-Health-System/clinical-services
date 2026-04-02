import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from './config/configuration';
import { TelemedicineModule } from './telemedicine/telemedicine.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // MongooseModule.forRoot(process.env.MONGODB_URI ?? ''),
    TelemedicineModule,
  ],
})
export class AppModule {}
