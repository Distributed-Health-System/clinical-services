import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/**
 * DoctorClient — Infrastructure External Service Adapter
 *
 * Handles outbound HTTP communication with the Doctor Service's integration
 * endpoints. This is the ONLY place in the Appointment Service that knows
 * the Doctor Service exists or how to query its availability system.
 *
 * Transport: Node.js native fetch (Node ≥ 18 / NestJS 11).
 *
 * Configuration:
 *   DOCTOR_SERVICE_URL env var controls the target:
 *     - Local dev:   http://localhost:3003
 *     - Kubernetes:  http://doctor-service:3003  (in-cluster DNS)
 *
 *   SERVICE_API_KEY env var — shared secret for inter-service authentication.
 *     - When set, sent as `X-Service-Api-Key` header on every request.
 *     - Must match `SERVICE_API_KEY` in doctor-service's environment.
 *     - If not set, the doctor-service integration guard falls back to
 *       expecting x-user-id/x-user-role headers, which we do NOT forward
 *       from appointment-service (service calls happen outside user context).
 *     - Recommendation: always configure SERVICE_API_KEY in both services.
 *
 * Authentication design:
 *   The Doctor Service integration routes use `ServiceOrGatewayAuthGuard`,
 *   which accepts EITHER an X-Service-Api-Key OR gateway user headers.
 *   We always use the API key approach here because:
 *     - Service calls can happen outside of a live user request context
 *     - Avoids role-header casing issues (DOCTOR vs doctor)
 *     - Cleaner and decoupled from end-user identity
 *
 * Behaviour when DOCTOR_SERVICE_URL is not set:
 *   validateSlot → warns and returns { valid: true } (dev fallback — no schedule)
 *   getFreeSlots → warns and returns [] (safe empty response)
 *
 * Behaviour when DOCTOR_SERVICE_URL is set but service is unreachable:
 *   validateSlot → throws ServiceUnavailableException (cannot blindly permit bookings)
 *   getFreeSlots → warns and returns [] (safe — UI shows no available slots)
 */
@Injectable()
export class DoctorClient {
  private readonly logger = new Logger(DoctorClient.name);

  // -------------------------------------------------------------------------
  // Private Helpers
  // -------------------------------------------------------------------------

  /** The Doctor Service base URL from environment. Empty string if not configured. */
  private get baseUrl(): string {
    return process.env.DOCTOR_SERVICE_URL ?? '';
  }

  /**
   * Builds the request headers for Doctor Service integration calls.
   * Always includes Content-Type. Includes X-Service-Api-Key when configured.
   */
  private _buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiKey = process.env.SERVICE_API_KEY;
    if (apiKey) {
      headers['X-Service-Api-Key'] = apiKey;
    } else {
      this.logger.warn(
        'SERVICE_API_KEY is not set. Doctor Service integration calls may fail ' +
          'if the doctor-service requires API key authentication.',
      );
    }
    return headers;
  }

  // -------------------------------------------------------------------------
  // Public Methods
  // -------------------------------------------------------------------------

  /**
   * Validates that a specific slot start time is within the doctor's configured
   * availability schedule (hours, breaks, and date overrides).
   *
   * This is the MANDATORY call made immediately before persisting any new or
   * rescheduled appointment. It is the only check that knows about the doctor's
   * working hours — our own conflict checks only track existing bookings.
   *
   * The Doctor Service checks:
   *   - Schedule exists and is active
   *   - slotStart is on the UTC :00/:30 grid
   *   - slotStart falls within a weekly availability window
   *   - slotStart is not inside a break rule
   *   - No date override marks this day as off (or out of custom hours)
   *
   * Failure behaviour:
   *   - If DOCTOR_SERVICE_URL is not set: returns { valid: true } with a warning
   *     (dev-mode fallback — mirrors how TelemedicineClient falls back to Jitsi)
   *   - If the service is reachable but returns valid=false: caller receives the
   *     reason string to forward as a user-friendly 400 error
   *   - If the service is unreachable: throws ServiceUnavailableException
   *     (we cannot grant a booking without schedule confirmation)
   *
   * @param doctorUserId - The doctor's auth user ID (same as Appointment.doctorId)
   * @param slotStart    - The proposed slot start time (UTC Date)
   */
  async validateSlot(
    doctorUserId: string,
    slotStart: Date,
  ): Promise<{ valid: boolean; reason?: string }> {
    if (!this.baseUrl) {
      this.logger.warn(
        'DOCTOR_SERVICE_URL is not set — skipping Doctor Service slot validation. ' +
          'Set this in production to enforce doctor availability rules.',
      );
      return { valid: true };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/doctors/integration/availability/validate-slot`,
        {
          method: 'POST',
          headers: this._buildHeaders(),
          body: JSON.stringify({
            doctorUserId,
            slotStart: slotStart.toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Doctor Service responded with HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as {
        valid: boolean;
        reason?: string;
      };
      return data;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.error(
        `Failed to validate slot with Doctor Service for doctor ${doctorUserId} ` +
          `at ${slotStart.toISOString()}: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Could not validate the appointment slot with the Doctor Service. Please try again shortly.',
      );
    }
  }

  /**
   * Fetches all available (free) slot start times for a doctor within a date range.
   *
   * Used by the GET /appointments/available-slots/:doctorId proxy endpoint so that
   * the frontend can populate a slot picker without knowing about the Doctor Service.
   * This maintains distribution transparency — the frontend only speaks to the
   * Appointment Service.
   *
   * Each returned string is a UTC ISO 8601 instant on the :00/:30 grid, inside the
   * doctor's configured availability, with breaks and date overrides applied.
   *
   * Failure behaviour:
   *   - DOCTOR_SERVICE_URL not set OR service unreachable → returns [] with a warning
   *     (safe — UI will show no available slots rather than crashing)
   *
   * @param doctorUserId - The doctor's auth user ID (same as Appointment.doctorId)
   * @param from         - Start of the query window (UTC Date)
   * @param to           - End of the query window (UTC Date)
   * @returns Array of UTC ISO 8601 slot start strings, e.g. ["2026-04-20T09:00:00.000Z", ...]
   */
  async getFreeSlots(
    doctorUserId: string,
    from: Date,
    to: Date,
  ): Promise<string[]> {
    if (!this.baseUrl) {
      this.logger.warn(
        'DOCTOR_SERVICE_URL is not set — returning empty free-slots list.',
      );
      return [];
    }

    try {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });

      const response = await fetch(
        `${this.baseUrl}/doctors/integration/availability/${doctorUserId}/free-slots?${params.toString()}`,
        { headers: this._buildHeaders() },
      );

      if (!response.ok) {
        this.logger.warn(
          `Doctor Service returned HTTP ${response.status} for free-slots ` +
            `(doctor: ${doctorUserId}). Returning empty list.`,
        );
        return [];
      }

      const data = (await response.json()) as { slots: string[] };
      return data.slots ?? [];
    } catch (error) {
      this.logger.warn(
        `Could not fetch free slots from Doctor Service for doctor ${doctorUserId}: ` +
          `${(error as Error).message}. Returning empty list.`,
      );
      return [];
    }
  }
}
