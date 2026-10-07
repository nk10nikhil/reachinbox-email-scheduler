import { NextRequest, NextResponse } from 'next/server';
import { initBackendServices } from '@/lib/backend-init';
import { getEmailQueue } from '@/lib/queue';
import { getScheduledEmailById, deleteScheduledEmail } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initBackendServices();
    const { id } = await params;

    const email = await getScheduledEmailById(id);
    if (!email) {
      return NextResponse.json({ error: 'Email record not found' }, { status: 404 });
    }

    // Remove from BullMQ queue if job ID exists
    const queue = getEmailQueue();
    const jobId = email.bull_job_id || email.id;
    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch {
      // Ignore queue removal error if job was already processed
    }

    // Delete from DB
    await deleteScheduledEmail(id);

    return NextResponse.json({
      success: true,
      message: `Scheduled email ${id} has been cancelled and removed.`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
