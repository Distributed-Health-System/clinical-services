/**
 * Environment configuration loader.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3002', 10),
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
  doctorService: {
    baseUrl: (process.env.DOCTOR_SERVICE_URL ?? '').replace(/\/$/, ''),
  },
  serviceApiKey: process.env.SERVICE_API_KEY ?? '',
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
});
