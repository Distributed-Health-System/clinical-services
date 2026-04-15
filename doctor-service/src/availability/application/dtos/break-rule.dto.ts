import { IsInt, Matches, Max, Min } from 'class-validator';

export class BreakRuleDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  start: string;

  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  end: string;
}
