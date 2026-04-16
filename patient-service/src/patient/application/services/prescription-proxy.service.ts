import {
  BadGatewayException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PATIENT_REPOSITORY } from '../../domain/repositories/patient.repository.interface';

@Injectable()
export class PrescriptionProxyService {
  constructor(
    private readonly config: ConfigService,
    @Inject(PATIENT_REPOSITORY)
    private readonly patientRepository: IPatientRepository,
  ) {}

  async listForPatient(
    patientId: string,
    options: { includeHistory?: boolean },
  ): Promise<unknown> {
    const patient = await this.patientRepository.findById(patientId);
    if (!patient) throw new NotFoundException('Patient not found.');

    const base = this.config.get<string>('doctorService.baseUrl')?.trim();
    if (!base) {
      throw new ServiceUnavailableException(
        'Doctor service URL is not configured (DOCTOR_SERVICE_URL).',
      );
    }

    const qs = options.includeHistory ? '?includeHistory=true' : '';
    const url = `${base}/doctors/integration/patients/${encodeURIComponent(patientId)}/prescriptions${qs}`;
    const apiKey = this.config.get<string>('serviceApiKey')?.trim();

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: apiKey ? { 'X-Service-Api-Key': apiKey } : undefined,
      });
    } catch {
      throw new BadGatewayException('Could not reach doctor-service.');
    }

    const text = await res.text();
    if (res.status === 404) {
      throw new NotFoundException('Patient or prescriptions not found.');
    }
    if (!res.ok) {
      throw new BadGatewayException(
        `doctor-service returned HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    try {
      return text ? JSON.parse(text) : [];
    } catch {
      throw new BadGatewayException('doctor-service returned invalid JSON.');
    }
  }
}
