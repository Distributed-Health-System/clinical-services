/**
 * Environment configuration loader.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3004', 10),
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
});
