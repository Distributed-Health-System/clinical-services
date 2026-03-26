/**
 * Environment configuration loader.
 */
export default () => ({
  port: parseInt(process.env.PORT ?? '3007', 10),
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
});
