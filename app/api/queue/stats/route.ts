import { NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { getQueueStats } from '@/lib/queue';
import { getSenderRateLimits, getDatabaseStats } from '@/lib/db';
import { getEtherealAccountInfo } from '@/lib/mailer';

export async function GET() {
  try {
    await initBackendServices();

    const [queueStats, senderLimits, dbStats] = await Promise.all([
      getQueueStats(),
      getSenderRateLimits(),
      getDatabaseStats(),
    ]);

    const etherealAccount = getEtherealAccountInfo();

    return NextResponse.json({
      success: true,
      queue: queueStats,
      rateLimits: senderLimits,
      database: dbStats,
      ethereal: {
        user: etherealAccount?.user || 'ethereal.auto@ethereal.email',
        hasWeb: Boolean(etherealAccount?.web),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
