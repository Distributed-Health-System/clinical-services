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
});
