import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TimeWindowDto } from './time-window.dto';

export class DateOverrideDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsBoolean()
  isOff: boolean;

  @ValidateIf((o: DateOverrideDto) => !o.isOff)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeWindowDto)
  @IsOptional()
  windows?: TimeWindowDto[];
}
