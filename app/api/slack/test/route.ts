import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { sendSlackTestMessage } from '@/lib/slack';

export async function POST(req: NextRequest) {
  try {
    await initBackendServices();
    const body = await req.json().catch(() => ({}));
    const { webhookUrl } = body;

    const result = await sendSlackTestMessage(webhookUrl);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
