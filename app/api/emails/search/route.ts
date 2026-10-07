import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { searchAllEmails } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await initBackendServices();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const sender = searchParams.get('sender') || undefined;
    const status = searchParams.get('status') || undefined;

    if (!q.trim()) {
      return NextResponse.json({
        success: true,
        totalMatches: 0,
        scheduled: [],
        sent: [],
      });
    }

    const results = await searchAllEmails(q, { sender, status });

    return NextResponse.json({
      success: true,
      query: q,
      totalMatches: results.totalMatches,
      scheduled: results.scheduled,
      sent: results.sent,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
