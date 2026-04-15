import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { WeeklyRuleDto } from './weekly-rule.dto';
import { BreakRuleDto } from './break-rule.dto';
import { DateOverrideDto } from './date-override.dto';

export class PutAvailabilityScheduleDto {
  @IsString()
  @IsNotEmpty()
  timezone: string;

  /** Must match appointment-service slot length (30) or 60 for double slots. */
  @IsIn([30, 60])
  slotDurationMinutes: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WeeklyRuleDto)
  weeklyRules: WeeklyRuleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BreakRuleDto)
  @IsOptional()
  breakRules?: BreakRuleDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DateOverrideDto)
  @IsOptional()
  dateOverrides?: DateOverrideDto[];

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  effectiveFrom?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsOptional()
  effectiveTo?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
