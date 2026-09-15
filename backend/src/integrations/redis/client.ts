import IORedis from 'ioredis';
import { config } from '../../config/env';
import { logger } from '../../utils/logger';

// REDIS_URL (a single connection string, as most hosted providers give you)
// takes precedence over separate host/port when set.
export const redis = config.redis.url
  ? new IORedis(config.redis.url, { maxRetriesPerRequest: null, lazyConnect: true })
  : new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('error', (err) => {
  logger.error('❌ Redis error:', err);
});

export async function connectRedis() {
  await redis.connect();
  await redis.ping();
  logger.info('Redis ping successful');
}