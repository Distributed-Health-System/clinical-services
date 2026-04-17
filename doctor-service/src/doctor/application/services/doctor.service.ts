import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { IDoctorRepository } from '../../domain/repositories/doctor.repository.interface';
import { DOCTOR_REPOSITORY } from '../../domain/repositories/doctor.repository.interface';
import { DoctorEntity } from '../../domain/entities/doctor.entity';
import { DoctorNotFoundException } from '../../domain/exceptions/doctor-not-found.exception';
import { CreateDoctorDto } from '../dtos/create-doctor.dto';
import { UpdateDoctorDto } from '../dtos/update-doctor.dto';
import { KeycloakAdminService } from '../../infrastructure/keycloak/keycloak-admin.service';

@Injectable()
export class DoctorService {
  private readonly logger = new Logger(DoctorService.name);

  constructor(
    @Inject(DOCTOR_REPOSITORY)
    private readonly doctorRepository: IDoctorRepository,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  findAll(specialization?: string): Promise<DoctorEntity[]> {
    const trimmed = specialization?.trim();
    console.log('Finding doctors with specialization filter:', trimmed);
    return this.doctorRepository.findAll(
      true,
      trimmed ? { specialization: trimmed } : undefined,
    );
  }

  async findById(
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<DoctorEntity> {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) throw new DoctorNotFoundException(id);

    // Unapproved profiles are only visible to the doctor themselves or admin
    if (
      !doctor.isApproved &&
      requestingUserRole !== 'admin' &&
      doctor.userId !== requestingUserId
    ) {
      throw new NotFoundException(`Doctor with id ${id} not found`);
    }

    return doctor;
  }

  async create(dto: CreateDoctorDto): Promise<DoctorEntity> {
    const { password, ...profile } = dto;

    const userId = await this.keycloakAdminService.createDoctorUser(
      dto.firstName,
      dto.lastName,
      dto.email,
      password,
    );

    try {
      return await this.doctorRepository.create({
        ...profile,
        userId,
        isApproved: false,
      });
    } catch (err) {
      this.logger.error(
        `DB save failed after Keycloak user created (${userId}), rolling back`,
      );
      await this.keycloakAdminService.deleteUser(userId);
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateDoctorDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<DoctorEntity> {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) throw new DoctorNotFoundException(id);

    if (requestingUserRole !== 'admin' && doctor.userId !== requestingUserId) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updated = await this.doctorRepository.update(id, dto);
    if (!updated) throw new DoctorNotFoundException(id);
    return updated;
  }

  async approve(id: string): Promise<DoctorEntity> {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) throw new DoctorNotFoundException(id);

    const updated = await this.doctorRepository.update(id, {
      isApproved: true,
    });
    if (!updated) throw new DoctorNotFoundException(id);
    return updated;
  }

  async reject(id: string): Promise<void> {
    const doctor = await this.doctorRepository.findById(id);
    if (!doctor) throw new DoctorNotFoundException(id);

    await this.doctorRepository.delete(id);
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.doctorRepository.delete(id);
    if (!deleted) throw new DoctorNotFoundException(id);
  }

  /** Profile for the authenticated doctor user (Keycloak / gateway user id). */
  async requireDoctorByUserId(userId: string): Promise<DoctorEntity> {
    const doctor = await this.doctorRepository.findByUserId(userId);
    if (!doctor) {
      throw new NotFoundException(
        'Doctor profile not found. Create your profile before using this feature.',
      );
    }
    return doctor;
  }

  /** Same as requireDoctorByUserId but enforces admin approval. */
  async requireApprovedDoctorByUserId(userId: string): Promise<DoctorEntity> {
    const doctor = await this.requireDoctorByUserId(userId);
    if (!doctor.isApproved) {
      throw new ForbiddenException(
        'Doctor profile is not approved yet. You cannot perform this action.',
      );
    }
    return doctor;
  }

  /** Resolve either Mongo `_id` or gateway `userId` to a doctor entity. */
  async resolveDoctorRef(doctorRef: string): Promise<DoctorEntity> {
    let doctor = await this.doctorRepository.findById(doctorRef);
    if (!doctor) {
      doctor = await this.doctorRepository.findByUserId(doctorRef);
    }
    if (!doctor) throw new DoctorNotFoundException(doctorRef);
    return doctor;
  }
}
