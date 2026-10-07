import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { getSlackConfig, saveSlackConfig } from '@/lib/db';

export async function GET() {
  try {
    await initBackendServices();
    const config = await getSlackConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initBackendServices();
    const body = await req.json();
    const { webhookUrl, botToken, channel, isConnected } = body;

    const saved = await saveSlackConfig({
      webhookUrl: webhookUrl || '',
      botToken: botToken || '',
      channel: channel || '#email-alerts',
      isConnected: isConnected !== undefined ? Boolean(isConnected) : Boolean(webhookUrl || botToken),
    });

    return NextResponse.json({
      success: true,
      message: saved.isConnected
        ? 'Slack integration connected successfully!'
        : 'Slack integration disconnected.',
      config: saved,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
