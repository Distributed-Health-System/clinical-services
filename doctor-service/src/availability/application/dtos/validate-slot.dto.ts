import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class ValidateSlotDto {
  @IsString()
  @IsNotEmpty()
  doctorUserId: string;

  @IsDateString()
  slotStart: string;
}
