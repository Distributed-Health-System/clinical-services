import { Matches } from 'class-validator';

export class TimeWindowDto {
  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, {
    message: 'start must be HH:mm (24h)',
  })
  start: string;

  @Matches(/^([01]?\d|2[0-3]):([0-5]\d)$/, {
    message: 'end must be HH:mm (24h)',
  })
  end: string;
}
