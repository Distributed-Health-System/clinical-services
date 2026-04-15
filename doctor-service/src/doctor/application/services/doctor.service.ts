import { Inject, Injectable } from '@nestjs/common';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.interface';
import { DOCTOR_REPOSITORY } from '../../domain/repositories/doctor.repository.interface';
import { DoctorEntity } from '../../domain/entities/doctor.entity';
import { DoctorNotFoundException } from '../../domain/exceptions/doctor-not-found.exception';
import { CreateDoctorDto } from '../dtos/create-doctor.dto';
import { UpdateDoctorDto } from '../dtos/update-doctor.dto';

@Injectable()
export class DoctorService {
  constructor(
    @Inject(DOCTOR_REPOSITORY)
    private readonly doctorRepository: IDoctorRepository,
  ) {}

  findAll(): Promise<DoctorEntity[]> {
    return this.doctorRepository.findAll();
  }

  async findById(id: string): Promise<DoctorEntity> {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) throw new DoctorNotFoundException(id);
    return doctor;
  }

  create(dto: CreateDoctorDto): Promise<DoctorEntity> {
    return this.doctorRepository.create(dto);
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<DoctorEntity> {
    const updated = await this.doctorRepository.update(id, dto);
    if (!updated) throw new DoctorNotFoundException(id);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.doctorRepository.delete(id);
    if (!deleted) throw new DoctorNotFoundException(id);
  }
}
