/**
 * Environment configuration loader.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3003', 10),
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
  patientService: {
    baseUrl: (process.env.PATIENT_SERVICE_URL ?? '').replace(/\/$/, ''),
  },
  /** Optional. When set, integration endpoints accept X-Service-Api-Key. */
  serviceApiKey: process.env.SERVICE_API_KEY ?? '',
 /** Must match appointment-service slot step (UTC half-hours). */
  appointmentSlotStepMinutes: parseInt(
    process.env.APPOINTMENT_SLOT_STEP_MINUTES ?? '30',
    10,
  ),
});
