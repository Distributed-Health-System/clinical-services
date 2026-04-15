import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PATIENT_REPOSITORY } from '../../domain/repositories/patient.repository.interface';
import { PatientEntity, PrescriptionRef, ReportRef } from '../../domain/entities/patient.entity';
import { PatientNotFoundException } from '../../domain/exceptions/patient-not-found.exception';
import { CreatePatientDto, PrescriptionRefDto, ReportRefDto } from '../dtos/create-patient.dto';
import { UpdatePatientDto } from '../dtos/update-patient.dto';

@Injectable()
export class PatientService {
  constructor(
    @Inject(PATIENT_REPOSITORY)
    private readonly patientRepository: IPatientRepository,
  ) {}

  private toDuplicateEmailConflict(error: unknown): never {
    const err = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000 && err.keyPattern?.email) {
      throw new ConflictException('Patient with this email already exists.');
    }
    throw error;
  }

  findAll(): Promise<PatientEntity[]> {
    return this.patientRepository.findAll();
  }

  async findById(id: string): Promise<PatientEntity> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) throw new PatientNotFoundException(id);
    return patient;
  }

  async create(dto: CreatePatientDto): Promise<PatientEntity> {
    try {
      return await this.patientRepository.create({
        ...dto,
        dateOfBirth: new Date(dto.dateOfBirth),
        prescriptions: (dto.prescriptions ?? []).map((p) => ({
          ...p,
          issuedAt: new Date(p.issuedAt),
          sourceService: p.sourceService ?? 'doctor-service',
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        })),
        reports: (dto.reports ?? []).map((r) => ({
          ...r,
          uploadedBy: 'patient',
          uploadedAt: new Date(r.uploadedAt),
          sourceService: r.sourceService ?? 'patient-service',
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        })),
      });
    } catch (error) {
      this.toDuplicateEmailConflict(error);
    }
  }

  async update(id: string, dto: UpdatePatientDto): Promise<PatientEntity> {
    try {
      const updated = await this.patientRepository.update(id, {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        prescriptions: dto.prescriptions?.map((p) => ({
          ...p,
          issuedAt: new Date(p.issuedAt),
          sourceService: p.sourceService ?? 'doctor-service',
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        })),
        reports: dto.reports?.map((r) => ({
          ...r,
          uploadedBy: 'patient',
          uploadedAt: new Date(r.uploadedAt),
          sourceService: r.sourceService ?? 'patient-service',
          createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
          updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date(),
        })),
      });
      if (!updated) throw new PatientNotFoundException(id);
      return updated;
    } catch (error) {
      this.toDuplicateEmailConflict(error);
    }
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.patientRepository.delete(id);
    if (!deleted) throw new PatientNotFoundException(id);
  }

  async addPrescription(id: string, dto: PrescriptionRefDto): Promise<PatientEntity> {
    const now = new Date();
    const prescription: PrescriptionRef = {
      ...dto,
      issuedAt: new Date(dto.issuedAt),
      sourceService: dto.sourceService ?? 'doctor-service',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : now,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : now,
    };
    const updated = await this.patientRepository.addPrescription(id, prescription);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async addReport(id: string, dto: ReportRefDto): Promise<PatientEntity> {
    const now = new Date();
    const report: ReportRef = {
      ...dto,
      uploadedBy: 'patient',
      uploadedAt: new Date(dto.uploadedAt),
      sourceService: dto.sourceService ?? 'patient-service',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : now,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : now,
    };
    const updated = await this.patientRepository.addReport(id, report);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async removePrescription(id: string, prescriptionId: string): Promise<PatientEntity> {
    const updated = await this.patientRepository.removePrescription(id, prescriptionId);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async removeReport(id: string, reportId: string): Promise<PatientEntity> {
    const updated = await this.patientRepository.removeReport(id, reportId);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async getPrescriptions(
    id: string,
    options: {
      uploadedByDoctorId?: string;
      limit?: number;
      offset?: number;
      sort?: string;
    },
  ): Promise<PrescriptionRef[]> {
    const patient = await this.findById(id);
    let prescriptions = [...patient.prescriptions];

    if (options.uploadedByDoctorId) {
      prescriptions = prescriptions.filter(
        (p) => p.uploadedByDoctorId === options.uploadedByDoctorId,
      );
    }

    prescriptions = this.sortRefs(
      prescriptions,
      options.sort,
      ['issuedAt', 'createdAt', 'updatedAt', 'title'],
      'issuedAt',
    );
    return this.paginate(prescriptions, options.limit, options.offset);
  }

  async getReports(
    id: string,
    options: {
      category?: 'lab' | 'scan' | 'discharge' | 'other';
      limit?: number;
      offset?: number;
      sort?: string;
    },
  ): Promise<ReportRef[]> {
    const patient = await this.findById(id);
    let reports = [...patient.reports];

    if (options.category) {
      reports = reports.filter((r) => r.category === options.category);
    }

    reports = this.sortRefs(
      reports,
      options.sort,
      ['uploadedAt', 'createdAt', 'updatedAt', 'title'],
      'uploadedAt',
    );
    return this.paginate(reports, options.limit, options.offset);
  }

  private paginate<T>(items: T[], limit = 50, offset = 0): T[] {
    const safeLimit = Math.max(1, Math.min(limit, 200));
    const safeOffset = Math.max(0, offset);
    return items.slice(safeOffset, safeOffset + safeLimit);
  }

  private sortRefs<T>(
    items: T[],
    sort: string | undefined,
    allowedFields: string[],
    defaultField: string,
  ): T[] {
    const [fieldRaw, directionRaw] = (sort ?? `${defaultField}:desc`).split(':');
    const field = allowedFields.includes(fieldRaw) ? fieldRaw : defaultField;
    const direction = directionRaw === 'asc' ? 1 : -1;

    return items.sort((a, b) => {
      const av = (a as Record<string, unknown>)[field];
      const bv = (b as Record<string, unknown>)[field];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      const aComparable = av as string | number | Date;
      const bComparable = bv as string | number | Date;
      return aComparable > bComparable ? direction : -direction;
    });
  }
}
