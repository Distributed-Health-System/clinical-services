import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

/**
 * TelemedicineClient — Infrastructure External Service Adapter
 *
 * Handles outbound HTTP communication with the Telemedicine Service.
 * This class is the ONLY place in the Appointment Service that knows
 * the Telemedicine Service exists or how to talk to it.
 *
 * Transport: Node.js native fetch (available in Node ≥ 18 / NestJS 11).
 * No @nestjs/axios or HttpModule required.
 *
 * Configuration:
 *   TELEMEDICINE_SERVICE_URL env var controls the target:
 *     - Local dev:   http://localhost:3005
 *     - Kubernetes:  http://telemedicine-service:3005  (in-cluster DNS)
 *
 * Fallback:
 *   If the env var is unset OR the service call fails for any reason,
 *   a mock Jitsi URL is returned instead. This keeps the appointment
 *   booking flow functional during development and before the Telemedicine
 *   Service is deployed.
 *
 * Expected Telemedicine Service contract (POST /sessions):
 *   Request body:  { appointmentId: string }
 *   Response body: { doctorLink: string, patientLink: string }
 */
@Injectable()
export class TelemedicineClient {
  private readonly logger = new Logger(TelemedicineClient.name);

  /**
   * Requests a telemedicine session URL from the Telemedicine Service.
   *
   * Called by AppointmentService when an appointment transitions to CONFIRMED.
   * Always returns a usable URL — falls back to a mock Jitsi URL on any failure.
   *
   * @param appointmentId - The confirmed appointment's ID (used as the session key).
   * @returns An object containing `doctorLink` and `patientLink`.
   */
  async generateLink(appointmentId: string): Promise<{ doctorLink: string; patientLink: string }> {
    const baseUrl = process.env.TELEMEDICINE_SERVICE_URL;

    // If the env var is not configured, return a mock URL immediately.
    // This is the expected behaviour in local development.
    if (!baseUrl) {
      this.logger.warn(
        'TELEMEDICINE_SERVICE_URL is not set — using mock Jitsi URL fallback.',
      );
      return this._mockUrl(appointmentId);
    }

    try {
      const response = await fetch(`${baseUrl}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        this.logger.error(
          `Telemedicine Service returned HTTP ${response.status} for appointment ${appointmentId}. Falling back to mock URL.`,
        );
        return this._mockUrl(appointmentId);
      }

      const data = (await response.json()) as { doctorLink: string; patientLink: string };

      if (!data?.doctorLink || !data?.patientLink) {
        this.logger.error(
          `Telemedicine Service response missing links for appointment ${appointmentId}. Falling back.`,
        );
        return this._mockUrl(appointmentId);
      }

      return data;
    } catch (error) {
      // Network error, timeout, DNS failure, etc.
      this.logger.error(
        `Failed to reach Telemedicine Service for appointment ${appointmentId}: ${(error as Error).message}. Falling back to mock URL.`,
      );
      return this._mockUrl(appointmentId);
    }
  }

  /**
   * Generates a deterministic-looking mock Jitsi URL.
   * Used as a fallback when the Telemedicine Service is unavailable.
   *
   * Format: doctor: https://meet.jit.si/telemed-<uuid>-host
   *         patient: https://meet.jit.si/telemed-<uuid>-guest
   */
  private _mockUrl(appointmentId: string): { doctorLink: string; patientLink: string } {
    this.logger.debug(`Generating mock telemedicine links for ${appointmentId}`);
    const sessionId = uuidv4();
    return {
      doctorLink: `https://meet.jit.si/telemed-${sessionId}-host`,
      patientLink: `https://meet.jit.si/telemed-${sessionId}-guest`,
    };
  }
}
