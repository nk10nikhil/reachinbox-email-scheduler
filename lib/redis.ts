import Redis from 'ioredis';
import { exec } from 'child_process';

let redisInstance: Redis | null = null;
let isStartingServer = false;

export function ensureRedisServerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    exec('redis-cli ping', (err, stdout) => {
      if (!err && stdout.includes('PONG')) {
        return resolve(true);
      }

      if (isStartingServer) {
        return resolve(false);
      }
      isStartingServer = true;

      // Attempt to start redis-server
      exec('service redis-server start || redis-server --daemonize yes', () => {
        isStartingServer = false;
        setTimeout(() => {
          exec('redis-cli ping', (checkErr, checkStdout) => {
            resolve(!checkErr && checkStdout.includes('PONG'));
          });
        }, 800);
      });
    });
  });
}

export function getRedisClient(): Redis {
  if (!redisInstance) {
    const host = process.env.REDIS_HOST || '127.0.0.1';
    const port = Number(process.env.REDIS_PORT || 6379);
    const password = process.env.REDIS_PASSWORD || undefined;

    redisInstance = new Redis({
      host,
      port,
      password,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy(times) {
        if (times <= 3) {
          ensureRedisServerRunning().catch(() => {});
        }
        return Math.min(times * 150, 2000);
      },
    });

    redisInstance.on('error', (err) => {
      // Quietly log and trigger auto-recovery
      if (err.message.includes('ECONNREFUSED')) {
        ensureRedisServerRunning().catch(() => {});
      }
    });
  }

  return redisInstance;
}

export function createRedisConnection(): Redis {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = Number(process.env.REDIS_PORT || 6379);
  const password = process.env.REDIS_PASSWORD || undefined;

  return new Redis({
    host,
    port,
    password,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 150, 2000);
    },
  });
}
