import { Injectable, Logger } from '@nestjs/common';

/**
 * PaymentClient — Infrastructure External Service Adapter
 *
 * Handles outbound HTTP communication with the Payment Service.
 * This class is the ONLY place in the Appointment Service that knows
 * the Payment Service exists or how to talk to it.
 *
 * Transport: Node.js native fetch (available in Node ≥ 18 / NestJS 11).
 *
 * Configuration:
 *   PAYMENT_SERVICE_URL env var controls the target:
 *     - Local dev:   http://localhost:3006
 *     - Kubernetes:  http://payment-service:3006  (in-cluster DNS)
 *
 * Current Status:
 *   The Payment Service has NOT been implemented yet. All calls will currently
 *   fail (connection refused or DNS not found). This is expected and handled
 *   gracefully — the appointment is created with paymentStatus = 'PENDING'
 *   and the Payment Service can update it asynchronously once it is live.
 *
 * Expected Payment Service contract (POST /payments/confirm):
 *   Request body:  { appointmentId: string }
 *   Response body: { status: 'PENDING' | 'CONFIRMED' | 'FAILED' }
 *
 * TODO: When the Payment Service is implemented, verify this contract matches
 *       and update the response shape if needed.
 */
@Injectable()
export class PaymentClient {
  private readonly logger = new Logger(PaymentClient.name);

  /**
   * Attempts to confirm payment for a newly created appointment.
   *
   * Called by AppointmentService immediately after creating a booking.
   * This call is NON-BLOCKING from the user's perspective — if the Payment
   * Service is unreachable, the appointment is still created with status 'PENDING'.
   *
   * @param appointmentId - The newly created appointment's ID.
   * @returns A payment status string: 'CONFIRMED' | 'PENDING' | 'FAILED'
   *          Always returns 'PENDING' on any error or missing configuration.
   */
  async confirmPayment(appointmentId: string): Promise<string> {
    const baseUrl = process.env.PAYMENT_SERVICE_URL;

    // If the env var is not configured, default to PENDING immediately.
    if (!baseUrl) {
      this.logger.warn(
        'PAYMENT_SERVICE_URL is not set — defaulting paymentStatus to PENDING.',
      );
      return 'PENDING';
    }

    try {
      const response = await fetch(`${baseUrl}/payments/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Payment Service returned HTTP ${response.status} for appointment ${appointmentId}. Defaulting to PENDING.`,
        );
        return 'PENDING';
      }

      const data = (await response.json()) as { status: string };

      if (!data?.status) {
        this.logger.warn(
          `Payment Service response missing status field for appointment ${appointmentId}. Defaulting to PENDING.`,
        );
        return 'PENDING';
      }

      this.logger.log(
        `Payment Service confirmed status '${data.status}' for appointment ${appointmentId}.`,
      );
      return data.status;
    } catch (error) {
      // Expected during development — Payment Service does not exist yet.
      // This will also catch network errors, timeouts, and DNS failures in production.
      this.logger.warn(
        `Could not reach Payment Service for appointment ${appointmentId}: ${(error as Error).message}. Defaulting paymentStatus to PENDING.`,
      );
      return 'PENDING';
    }
  }
}
