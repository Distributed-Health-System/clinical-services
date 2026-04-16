import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DoctorService } from '../../../doctor/application/services/doctor.service';
import { PrescriptionEntity } from '../../domain/entities/prescription.entity';
import { PrescriptionStatus } from '../../domain/enums/prescription-status.enum';
import type { IPrescriptionRepository } from '../../domain/repositories/prescription.repository.interface';
import { PRESCRIPTION_REPOSITORY } from '../../domain/repositories/prescription.repository.interface';
import { CreatePrescriptionDto } from '../dtos/create-prescription.dto';
import { AmendPrescriptionDto } from '../dtos/amend-prescription.dto';

@Injectable()
export class PrescriptionService {
  constructor(
    @Inject(PRESCRIPTION_REPOSITORY)
    private readonly prescriptionRepository: IPrescriptionRepository,
    private readonly doctorService: DoctorService,
  ) {}

  async create(
    dto: CreatePrescriptionDto,
    authUserId: string,
  ): Promise<PrescriptionEntity> {
    const doctor = await this.doctorService.requireApprovedDoctorByUserId(
      authUserId,
    );
    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : new Date();
    const validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;

    return this.prescriptionRepository.create({
      doctorUserId: authUserId,
      doctorProfileId: doctor.id,
      patientId: dto.patientId,
      appointmentId: dto.appointmentId,
      version: 1,
      status: PrescriptionStatus.ACTIVE,
      items: dto.items,
      diagnosis: dto.diagnosis,
      notes: dto.notes,
      issuedAt,
      validUntil,
      artifact: dto.artifact,
    });
  }

  async listForMe(
    authUserId: string,
    options: { patientId?: string; includeHistory?: boolean },
  ): Promise<PrescriptionEntity[]> {
    await this.doctorService.requireDoctorByUserId(authUserId);
    const statuses = options.includeHistory
      ? undefined
      : [PrescriptionStatus.ACTIVE];
    return this.prescriptionRepository.findByDoctorUserId(authUserId, {
      patientId: options.patientId,
      statuses,
    });
  }

  async findOneForDoctor(
    prescriptionId: string,
    authUserId: string,
  ): Promise<PrescriptionEntity> {
    await this.doctorService.requireDoctorByUserId(authUserId);
    const p = await this.prescriptionRepository.findById(prescriptionId);
    if (!p) throw new NotFoundException('Prescription not found.');
    if (p.doctorUserId !== authUserId) {
      throw new ForbiddenException('You cannot access this prescription.');
    }
    return p;
  }

  async listForPatient(
    patientId: string,
    options: { includeHistory?: boolean },
  ): Promise<PrescriptionEntity[]> {
    const statuses = options.includeHistory
      ? undefined
      : [PrescriptionStatus.ACTIVE];
    return this.prescriptionRepository.findByPatientId(patientId, { statuses });
  }

  async amend(
    prescriptionId: string,
    dto: AmendPrescriptionDto,
    authUserId: string,
  ): Promise<PrescriptionEntity> {
    await this.doctorService.requireApprovedDoctorByUserId(authUserId);
    const prev = await this.prescriptionRepository.findById(prescriptionId);
    if (!prev) throw new NotFoundException('Prescription not found.');
    if (prev.doctorUserId !== authUserId) {
      throw new ForbiddenException('You cannot amend this prescription.');
    }
    if (prev.status !== PrescriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'Only an ACTIVE prescription can be amended.',
      );
    }

    const hasChange =
      dto.items !== undefined ||
      dto.diagnosis !== undefined ||
      dto.notes !== undefined ||
      dto.validUntil !== undefined ||
      dto.artifact !== undefined;
    if (!hasChange) {
      throw new BadRequestException(
        'Provide at least one field to amend (items, diagnosis, notes, validUntil, artifact).',
      );
    }

    const next = await this.prescriptionRepository.create({
      doctorUserId: prev.doctorUserId,
      doctorProfileId: prev.doctorProfileId,
      patientId: prev.patientId,
      appointmentId: prev.appointmentId,
      version: prev.version + 1,
      status: PrescriptionStatus.ACTIVE,
      previousPrescriptionId: prev.id,
      items: dto.items ?? prev.items,
      diagnosis: dto.diagnosis ?? prev.diagnosis,
      notes: dto.notes ?? prev.notes,
      issuedAt: new Date(),
      validUntil: dto.validUntil
        ? new Date(dto.validUntil)
        : prev.validUntil,
      artifact: dto.artifact ?? prev.artifact,
    });

    const amended = await this.prescriptionRepository.updateStatus(
      prev.id,
      PrescriptionStatus.AMENDED,
    );
    if (!amended) {
      throw new NotFoundException('Original prescription could not be updated.');
    }

    return next;
  }

  async revoke(
    prescriptionId: string,
    authUserId: string,
    reason?: string,
  ): Promise<PrescriptionEntity> {
    await this.doctorService.requireApprovedDoctorByUserId(authUserId);
    const p = await this.prescriptionRepository.findById(prescriptionId);
    if (!p) throw new NotFoundException('Prescription not found.');
    if (p.doctorUserId !== authUserId) {
      throw new ForbiddenException('You cannot revoke this prescription.');
    }
    if (p.status !== PrescriptionStatus.ACTIVE) {
      throw new BadRequestException('Only an ACTIVE prescription can be revoked.');
    }
    const updated = await this.prescriptionRepository.updateStatus(
      prescriptionId,
      PrescriptionStatus.REVOKED,
      {
        revocationReason: reason,
        revokedAt: new Date(),
      },
    );
    if (!updated) throw new NotFoundException('Prescription not found.');
    return updated;
  }
}
