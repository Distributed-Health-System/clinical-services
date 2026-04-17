import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum WebhookPaymentStatus {
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export class PaymentWebhookDto {
  @ApiProperty({ description: 'The internal ID of the appointment.' })
  @IsString()
  @IsNotEmpty()
  appointmentId: string;

  @ApiProperty({ enum: WebhookPaymentStatus, description: 'The final status of the payment.' })
  @IsEnum(WebhookPaymentStatus)
  status: WebhookPaymentStatus;

  @ApiProperty({ description: 'The provider transaction ID for the payment.' })
  @IsString()
  @IsNotEmpty()
  transactionId: string;
}
