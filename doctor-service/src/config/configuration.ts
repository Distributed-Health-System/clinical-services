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
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? '',
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '',
    signedUrlExpirySeconds: parseInt(
      process.env.FIREBASE_SIGNED_URL_EXPIRY_SECONDS ?? '600',
      10,
    ),
  },
  /** Optional. When set, integration endpoints accept X-Service-Api-Key. */
  serviceApiKey: process.env.SERVICE_API_KEY ?? '',
  /** Must match appointment-service slot step (UTC half-hours). */
  appointmentSlotStepMinutes: parseInt(
    process.env.APPOINTMENT_SLOT_STEP_MINUTES ?? '30',
    10,
  ),
});
