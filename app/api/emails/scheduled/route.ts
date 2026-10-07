import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { getScheduledEmails } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await initBackendServices();

    const { searchParams } = new URL(req.url);
    const sender = searchParams.get('sender') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;

    const emails = await getScheduledEmails({ sender, status, limit });

    return NextResponse.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
