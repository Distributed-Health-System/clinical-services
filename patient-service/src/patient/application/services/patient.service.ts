import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PATIENT_REPOSITORY } from '../../domain/repositories/patient.repository.interface';
import { PatientEntity, ReportRef } from '../../domain/entities/patient.entity';
import { PatientNotFoundException } from '../../domain/exceptions/patient-not-found.exception';
import { CreatePatientDto, ReportRefDto } from '../dtos/create-patient.dto';
import { UpdatePatientDto } from '../dtos/update-patient.dto';
import { PrescriptionProxyService } from './prescription-proxy.service';
import {
  CreateReportUploadIntentDto,
  FinalizeReportUploadDto,
} from '../dtos/report-upload.dto';
import { FirebaseStorageService } from './firebase-storage.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PatientService {
  constructor(
    @Inject(PATIENT_REPOSITORY)
    private readonly patientRepository: IPatientRepository,
    private readonly prescriptionProxy: PrescriptionProxyService,
    private readonly firebaseStorage: FirebaseStorageService,
  ) {}

  private toDuplicateEmailConflict(error: unknown): never {
    const err = error as { code?: number; keyPattern?: Record<string, unknown> };
    if (err?.code === 11000 && (err.keyPattern?.email || err.keyPattern?.userId)) {
      throw new ConflictException('Patient with this identity already exists.');
    }
    throw error;
  }

  private async assertCanAccessPatient(
    patientId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<PatientEntity> {
    const patient = await this.findById(patientId);
    if (
      requestingUserRole !== 'admin' &&
      requestingUserRole !== 'doctor' &&
      patient.userId !== requestingUserId
    ) {
      throw new ForbiddenException('You can only access your own patient profile.');
    }
    return patient;
  }

  async findAll(requestingUserRole: string): Promise<PatientEntity[]> {
    if (requestingUserRole !== 'admin') {
      throw new ForbiddenException('Only admin can list all patients.');
    }
    return this.patientRepository.findAll();
  }

  async findById(id: string): Promise<PatientEntity> {
    const patient = await this.patientRepository.findById(id);
    if (!patient) throw new PatientNotFoundException(id);
    return patient;
  }

  async getByIdForRequester(
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<PatientEntity> {
    return this.assertCanAccessPatient(id, requestingUserId, requestingUserRole);
  }

  async findMyByUserId(userId: string): Promise<PatientEntity> {
    const patient = await this.patientRepository.findByUserId(userId);
    if (!patient) throw new PatientNotFoundException(userId);
    return patient;
  }

  async create(dto: CreatePatientDto, userId: string): Promise<PatientEntity> {
    const existing = await this.patientRepository.findByUserId(userId);
    if (existing) {
      throw new ConflictException('Patient profile already exists for this user.');
    }
    try {
      return await this.patientRepository.create({
        ...dto,
        userId,
        dateOfBirth: new Date(dto.dateOfBirth),
      });
    } catch (error) {
      this.toDuplicateEmailConflict(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<PatientEntity> {
    await this.assertCanAccessPatient(id, requestingUserId, requestingUserRole);
    try {
      const updated = await this.patientRepository.update(id, {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      });
      if (!updated) throw new PatientNotFoundException(id);
      return updated;
    } catch (error) {
      this.toDuplicateEmailConflict(error);
    }
  }

  async updateMy(
    userId: string,
    dto: UpdatePatientDto,
  ): Promise<PatientEntity> {
    const me = await this.findMyByUserId(userId);
    return this.update(me.id, dto, userId, 'patient');
  }

  async delete(id: string, requestingUserRole: string): Promise<void> {
    if (requestingUserRole !== 'admin') {
      throw new ForbiddenException('Only admin can delete patient profiles.');
    }
    const deleted = await this.patientRepository.delete(id);
    if (!deleted) throw new PatientNotFoundException(id);
  }

  async addReport(
    id: string,
    dto: ReportRefDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<PatientEntity> {
    const patient = await this.assertCanAccessPatient(
      id,
      requestingUserId,
      requestingUserRole,
    );
    if (requestingUserRole === 'patient' && patient.userId !== requestingUserId) {
      throw new ForbiddenException('Patients can only upload their own reports.');
    }
    const now = new Date();
    const report: ReportRef = {
      ...dto,
      uploadedBy: 'patient',
      uploadedById: requestingUserId,
      uploadedAt: new Date(dto.uploadedAt),
      sourceService: dto.sourceService ?? 'patient-service',
      createdAt: dto.createdAt ? new Date(dto.createdAt) : now,
      updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : now,
    };
    const updated = await this.patientRepository.addReport(id, report);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async createReportUploadIntent(
    id: string,
    dto: CreateReportUploadIntentDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<{
    reportId: string;
    blobKey: string;
    uploadUrl: string;
    expiresAt: string;
    requiredHeaders: { 'Content-Type': string };
  }> {
    const patient = await this.assertCanAccessPatient(
      id,
      requestingUserId,
      requestingUserRole,
    );
    if (requestingUserRole === 'patient' && patient.userId !== requestingUserId) {
      throw new ForbiddenException('Patients can only upload their own reports.');
    }

    const reportId = randomUUID();
    const safeFilename = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const blobKey = `patients/${patient.id}/reports/${reportId}/${safeFilename}`;
    const signed = await this.firebaseStorage.createUploadUrl(blobKey, dto.mimeType);

    return {
      reportId,
      blobKey,
      uploadUrl: signed.uploadUrl,
      expiresAt: signed.expiresAt,
      requiredHeaders: {
        'Content-Type': dto.mimeType,
      },
    };
  }

  async finalizeReportUpload(
    id: string,
    dto: FinalizeReportUploadDto,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<PatientEntity> {
    const patient = await this.assertCanAccessPatient(
      id,
      requestingUserId,
      requestingUserRole,
    );
    if (requestingUserRole === 'patient' && patient.userId !== requestingUserId) {
      throw new ForbiddenException('Patients can only finalize their own reports.');
    }
    await this.firebaseStorage.ensureBlobExists(dto.blobKey);

    const now = new Date();
    const report: ReportRef = {
      id: dto.reportId,
      title: dto.title,
      blobKey: dto.blobKey,
      fileUrl: this.firebaseStorage.makeInternalFileUrl(dto.blobKey),
      mimeType: dto.mimeType,
      uploadedBy: 'patient',
      uploadedById: requestingUserId,
      uploadedAt: new Date(dto.uploadedAt),
      category: dto.category,
      sourceService: 'patient-service',
      createdAt: now,
      updatedAt: now,
    };
    const updated = await this.patientRepository.addReport(id, report);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async getReportDownloadUrl(
    id: string,
    reportId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<{ reportId: string; blobKey: string; downloadUrl: string; expiresAt: string }> {
    const patient = await this.assertCanAccessPatient(id, requestingUserId, requestingUserRole);
    const report = patient.reports.find((r) => r.id === reportId);
    if (!report) throw new PatientNotFoundException(reportId);
    const signed = await this.firebaseStorage.createDownloadUrl(report.blobKey);
    return {
      reportId: report.id,
      blobKey: report.blobKey,
      downloadUrl: signed.downloadUrl,
      expiresAt: signed.expiresAt,
    };
  }

  async removeReport(
    id: string,
    reportId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<PatientEntity> {
    await this.assertCanAccessPatient(id, requestingUserId, requestingUserRole);
    const updated = await this.patientRepository.removeReport(id, reportId);
    if (!updated) throw new PatientNotFoundException(id);
    return updated;
  }

  async getPrescriptions(
    id: string,
    options: { includeHistory?: boolean },
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<unknown> {
    const patient = await this.assertCanAccessPatient(id, requestingUserId, requestingUserRole);
    return this.prescriptionProxy.listForPatient(patient.id, options);
  }

  async getReports(
    id: string,
    options: {
      category?: 'lab' | 'scan' | 'discharge' | 'other';
      limit?: number;
      offset?: number;
      sort?: string;
    },
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<ReportRef[]> {
    const patient = await this.assertCanAccessPatient(id, requestingUserId, requestingUserRole);
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
