import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { pauseQueue, resumeQueue, cleanQueue, simulateServerRestart } from '@/lib/queue';

export async function POST(req: NextRequest) {
  try {
    await initBackendServices();

    const body = await req.json();
    const { action } = body;

    if (action === 'pause') {
      await pauseQueue();
      return NextResponse.json({ success: true, message: 'BullMQ queue paused' });
    }

    if (action === 'resume') {
      await resumeQueue();
      return NextResponse.json({ success: true, message: 'BullMQ queue resumed' });
    }

    if (action === 'clean') {
      await cleanQueue();
      return NextResponse.json({ success: true, message: 'Completed and failed jobs cleaned' });
    }

    if (action === 'simulate_restart') {
      const result = await simulateServerRestart();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
