/**
 * Environment configuration loader.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3006', 10),
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
});
