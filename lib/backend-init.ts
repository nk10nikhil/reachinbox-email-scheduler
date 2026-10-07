import { ensureRedisServerRunning } from './redis';
import { getDb } from './db';
import { getMailerTransporter } from './mailer';
import { initBullWorker, reconcileScheduledJobsOnBoot } from './queue';

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

export async function initBackendServices(): Promise<boolean> {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('🚀 [ReachInbox] Initializing backend services...');

      // 1. Ensure Redis is up
      await ensureRedisServerRunning();

      // 2. Initialize PostgreSQL schema
      await getDb();

      // 3. Setup Ethereal SMTP transporter in background
      getMailerTransporter().catch((err) => {
        console.warn('⚠️ Ethereal transporter warm-up warning:', err.message);
      });

      // 4. Start BullMQ worker
      initBullWorker();

      // 5. Reconcile any existing scheduled jobs for persistence
      setTimeout(() => {
        reconcileScheduledJobsOnBoot().catch((err) => {
          console.error('Failed initial job reconciliation:', err);
        });
      }, 500);

      isInitialized = true;
      console.log('✅ [ReachInbox] All backend services (Redis, PostgreSQL, BullMQ, Ethereal) are live!');
      return true;
    } catch (err) {
      console.error('❌ [ReachInbox] Backend initialization failed:', err);
      return false;
    }
  })();

  return initPromise;
}
