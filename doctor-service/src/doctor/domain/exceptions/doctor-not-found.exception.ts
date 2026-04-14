import { NotFoundException } from '@nestjs/common';

export class DoctorNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Doctor with id "${id}" was not found.`);
  }
}
