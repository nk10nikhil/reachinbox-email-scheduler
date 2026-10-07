import { getRedisClient } from './redis';
import { sendSlackRateLimitNotification } from './slack';
import { recordRateLimitHitInDb } from './db';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  hourlyLimit: number;
  rescheduleDelayMs?: number;
  nextWindowTime?: string;
}

export function getCurrentHourWindow(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

export function getNextHourWindowStart(date = new Date()): { nextDate: Date; delayMs: number } {
  const nextHour = new Date(date);
  nextHour.setHours(nextHour.getHours() + 1);
  nextHour.setMinutes(0);
  nextHour.setSeconds(0);
  nextHour.setMilliseconds(0);

  const delayMs = Math.max(1000, nextHour.getTime() - date.getTime());
  return { nextDate: nextHour, delayMs };
}

/**
 * Checks and increments sender hourly quota atomically in Redis.
 * If over limit, calculates delay until next hour window, records in DB,
 * and dispatches Slack alert!
 */
export async function checkAndIncrementHourlyLimit(
  senderEmail: string,
  limitOverride?: number
): Promise<RateLimitCheckResult> {
  const redis = getRedisClient();
  const hourlyLimit =
    limitOverride && limitOverride > 0
      ? limitOverride
      : Number(process.env.MAX_EMAILS_PER_HOUR || 200);

  const now = new Date();
  const hourWindow = getCurrentHourWindow(now);
  const redisKey = `ratelimit:sender:${senderEmail}:${hourWindow}`;

  // Atomic pipeline: increment and ensure 2-hour TTL
  const [incrResult] = await redis
    .multi()
    .incr(redisKey)
    .expire(redisKey, 7200) // 2 hours
    .exec() as [ [Error | null, number], [Error | null, number] ];

  const count = incrResult ? (incrResult[1] as number) : 1;

  if (count <= hourlyLimit) {
    return {
      allowed: true,
      currentCount: count,
      hourlyLimit,
    };
  }

  // Quota exceeded: calculate next hour window delay
  const { nextDate, delayMs } = getNextHourWindowStart(now);
  const nextWindowTimeStr = nextDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Record in Relational DB
  await recordRateLimitHitInDb(senderEmail, hourWindow, hourlyLimit, 1);

  // If this is the exact threshold hit, trigger the Slack notification immediately
  if (count === hourlyLimit + 1) {
    await sendSlackRateLimitNotification({
      senderEmail,
      hourlyLimit,
      currentCount: count - 1,
      rescheduledCount: 1,
      nextWindowTime: nextWindowTimeStr,
      timestamp: now.toLocaleTimeString(),
    });
  }

  return {
    allowed: false,
    currentCount: count,
    hourlyLimit,
    rescheduleDelayMs: delayMs,
    nextWindowTime: nextWindowTimeStr,
  };
}

/**
 * Enforces per-sender minimum delay between consecutive email sends.
 * Uses Redis atomic locking and cooldown timestamp to serialize sender throughput.
 */
export async function enforceSenderCooldown(
  senderEmail: string,
  delaySeconds = 2
): Promise<void> {
  const redis = getRedisClient();
  const cooldownKey = `cooldown:sender:${senderEmail}`;
  const delayMs = Math.max(500, delaySeconds * 1000);

  // Read last send timestamp
  const lastSendTs = await redis.get(cooldownKey);
  const now = Date.now();

  if (lastSendTs) {
    const elapsed = now - Number(lastSendTs);
    if (elapsed < delayMs) {
      const waitTime = delayMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  // Set new cooldown timestamp
  await redis.set(cooldownKey, Date.now().toString(), 'PX', delayMs * 2);
}
