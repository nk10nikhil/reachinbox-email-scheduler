import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { getEmailQueue } from '@/lib/queue';
import { saveCampaign, saveScheduledEmails } from '@/lib/db';
import type { CampaignRecord, ScheduledEmailRecord } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    await initBackendServices();

    const body = await req.json();
    const {
      senderEmail,
      subject,
      body: emailBody,
      recipients,
      startTime,
      delaySeconds = 2,
      hourlyLimit = 200,
      campaignTitle,
    } = body;

    if (!senderEmail || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: senderEmail, subject, or body' },
        { status: 400 }
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients list must contain at least one valid email address' },
        { status: 400 }
      );
    }

    // Clean and validate emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipients
      .map((r: string) => r.trim().toLowerCase())
      .filter((r: string) => emailRegex.test(r));

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: 'No valid email addresses found in recipients list' },
        { status: 400 }
      );
    }

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date();
    const baseStartTime = startTime ? new Date(startTime).getTime() : now.getTime();
    const startTimestamp = Math.max(now.getTime(), baseStartTime);

    const queue = getEmailQueue();
    const scheduledRecords: ScheduledEmailRecord[] = [];

    // Calculate staggered schedule time for each recipient
    const delayStepMs = Math.max(500, Number(delaySeconds) * 1000);

    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      const emailId = `email_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      const targetTimeMs = startTimestamp + i * delayStepMs;
      const scheduledIso = new Date(targetTimeMs).toISOString();
      const delayMs = Math.max(0, targetTimeMs - Date.now());

      // Add to BullMQ with delayed execution (NO CRON!)
      const job = await queue.add(
        'send-email',
        {
          emailId,
          campaignId,
          senderEmail,
          recipientEmail: recipient,
          subject,
          body: emailBody,
          delayBetweenSendsSec: Number(delaySeconds),
          hourlyLimit: Number(hourlyLimit),
          scheduledAt: scheduledIso,
          attempt: 1,
        },
        {
          delay: delayMs,
          jobId: emailId,
        }
      );

      scheduledRecords.push({
        id: emailId,
        campaign_id: campaignId,
        sender_email: senderEmail,
        recipient_email: recipient,
        subject,
        body: emailBody,
        scheduled_at: scheduledIso,
        status: 'scheduled',
        bull_job_id: job.id?.toString(),
        delay_seconds: Number(delaySeconds),
        hourly_limit: Number(hourlyLimit),
        attempt_count: 0,
        created_at: now.toISOString(),
      });
    }

    // Persist campaign and scheduled emails in relational DB (PostgreSQL)
    const campaign: CampaignRecord = {
      id: campaignId,
      title: campaignTitle || `Campaign ${new Date().toLocaleDateString()}`,
      sender_email: senderEmail,
      subject,
      body: emailBody,
      start_time: new Date(startTimestamp).toISOString(),
      delay_seconds: Number(delaySeconds),
      hourly_limit: Number(hourlyLimit),
      total_leads: validRecipients.length,
      sent_count: 0,
      failed_count: 0,
      status: 'scheduled',
      created_at: now.toISOString(),
    };

    await saveCampaign(campaign);
    await saveScheduledEmails(scheduledRecords);

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${validRecipients.length} email(s) starting at ${new Date(
        startTimestamp
      ).toLocaleTimeString()}`,
      campaignId,
      scheduledCount: validRecipients.length,
      firstScheduledAt: new Date(startTimestamp).toISOString(),
      lastScheduledAt: scheduledRecords[scheduledRecords.length - 1].scheduled_at,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Schedule API error:', err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
