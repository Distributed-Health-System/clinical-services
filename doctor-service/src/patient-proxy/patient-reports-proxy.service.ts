import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DoctorService } from '../doctor/application/services/doctor.service';

export type PatientReportsQuery = {
  category?: 'lab' | 'scan' | 'discharge' | 'other';
  limit?: number;
  offset?: number;
  sort?: string;
};

@Injectable()
export class PatientReportsProxyService {
  constructor(
    private readonly config: ConfigService,
    private readonly doctorService: DoctorService,
  ) {}

  async getReportsForDoctor(
    authUserId: string,
    patientId: string,
    query: PatientReportsQuery,
  ): Promise<unknown> {
    await this.doctorService.requireApprovedDoctorByUserId(authUserId);

    const base = this.config.get<string>('patientService.baseUrl')?.trim();
    if (!base) {
      throw new ServiceUnavailableException(
        'Patient service URL is not configured (PATIENT_SERVICE_URL).',
      );
    }

    const params = new URLSearchParams();
    if (query.category) params.set('category', query.category);
    if (query.limit !== undefined) params.set('limit', String(query.limit));
    if (query.offset !== undefined) params.set('offset', String(query.offset));
    if (query.sort) params.set('sort', query.sort);

    const qs = params.toString();
    const url = `${base}/patients/${encodeURIComponent(patientId)}/reports${qs ? `?${qs}` : ''}`;

    let res: Response;
    try {
      res = await fetch(url, { method: 'GET' });
    } catch {
      throw new BadGatewayException('Could not reach patient-service.');
    }

    const text = await res.text();
    if (res.status === 404) {
      throw new NotFoundException('Patient not found.');
    }
    if (!res.ok) {
      throw new BadGatewayException(
        `patient-service returned HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }

    try {
      return text ? JSON.parse(text) : [];
    } catch {
      throw new BadGatewayException('patient-service returned invalid JSON.');
    }
  }
}
