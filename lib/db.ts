import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import type {
  CampaignRecord,
  ScheduledEmailRecord,
  SentEmailRecord,
  SlackConfig,
  SenderRateLimitInfo,
} from './types';

let pgliteInstance: PGlite | null = null;
let isInitialized = false;

// Ensure database directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Ignore error if directory already exists
  }
}

export async function getDb(): Promise<PGlite> {
  if (!pgliteInstance) {
    const dbPath = path.join(DATA_DIR, 'reachinbox-pg');
    pgliteInstance = new PGlite(dbPath);
    await initSchema(pgliteInstance);
  }
  return pgliteInstance;
}

async function initSchema(db: PGlite): Promise<void> {
  if (isInitialized) return;

  const schemaSql = `
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      sender_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      start_time TEXT NOT NULL,
      delay_seconds INTEGER NOT NULL DEFAULT 2,
      hourly_limit INTEGER NOT NULL DEFAULT 200,
      total_leads INTEGER NOT NULL DEFAULT 0,
      sent_count INTEGER NOT NULL DEFAULT 0,
      failed_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      sender_email TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled',
      bull_job_id TEXT,
      delay_seconds INTEGER NOT NULL DEFAULT 2,
      hourly_limit INTEGER NOT NULL DEFAULT 200,
      attempt_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sent_emails (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      sender_email TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'sent',
      ethereal_preview_url TEXT,
      message_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS slack_integrations (
      id TEXT PRIMARY KEY,
      webhook_url TEXT NOT NULL,
      bot_token TEXT,
      channel TEXT,
      is_connected BOOLEAN NOT NULL DEFAULT true,
      last_notified_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sender_rate_limits (
      id TEXT PRIMARY KEY,
      sender_email TEXT NOT NULL,
      hour_window TEXT NOT NULL,
      sent_count INTEGER NOT NULL DEFAULT 0,
      max_limit INTEGER NOT NULL DEFAULT 200,
      rescheduled_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_status ON scheduled_emails(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_time ON scheduled_emails(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_sent_time ON sent_emails(sent_at);
    CREATE INDEX IF NOT EXISTS idx_sent_sender ON sent_emails(sender_email);
  `;

  await db.exec(schemaSql);
  isInitialized = true;
}

// ----------------- Campaigns -----------------
export async function saveCampaign(campaign: CampaignRecord): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO campaigns (id, title, sender_email, subject, body, start_time, delay_seconds, hourly_limit, total_leads, sent_count, failed_count, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       sent_count = EXCLUDED.sent_count,
       failed_count = EXCLUDED.failed_count;`,
    [
      campaign.id,
      campaign.title,
      campaign.sender_email,
      campaign.subject,
      campaign.body,
      campaign.start_time,
      campaign.delay_seconds,
      campaign.hourly_limit,
      campaign.total_leads,
      campaign.sent_count,
      campaign.failed_count,
      campaign.status,
      campaign.created_at,
    ]
  );
}

export async function getCampaigns(): Promise<CampaignRecord[]> {
  const db = await getDb();
  const res = await db.query<CampaignRecord>(
    `SELECT * FROM campaigns ORDER BY created_at DESC;`
  );
  return res.rows;
}

// ----------------- Scheduled Emails -----------------
export async function saveScheduledEmails(
  emails: ScheduledEmailRecord[]
): Promise<void> {
  const db = await getDb();
  for (const email of emails) {
    await db.query(
      `INSERT INTO scheduled_emails (id, campaign_id, sender_email, recipient_email, subject, body, scheduled_at, status, bull_job_id, delay_seconds, hourly_limit, attempt_count, error_message, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         bull_job_id = EXCLUDED.bull_job_id,
         attempt_count = EXCLUDED.attempt_count,
         error_message = EXCLUDED.error_message;`,
      [
        email.id,
        email.campaign_id || null,
        email.sender_email,
        email.recipient_email,
        email.subject,
        email.body,
        email.scheduled_at,
        email.status,
        email.bull_job_id || null,
        email.delay_seconds,
        email.hourly_limit,
        email.attempt_count,
        email.error_message || null,
        email.created_at,
      ]
    );
  }
}

export async function getScheduledEmails(options?: {
  sender?: string;
  status?: string;
  limit?: number;
}): Promise<ScheduledEmailRecord[]> {
  const db = await getDb();
  let sql = `SELECT * FROM scheduled_emails WHERE status IN ('scheduled', 'processing', 'delayed')`;
  const params: unknown[] = [];

  if (options?.sender) {
    params.push(options.sender);
    sql += ` AND sender_email = $${params.length}`;
  }
  if (options?.status && options.status !== 'all') {
    params.push(options.status);
    sql += ` AND status = $${params.length}`;
  }

  sql += ` ORDER BY scheduled_at ASC`;

  if (options?.limit) {
    params.push(options.limit);
    sql += ` LIMIT $${params.length}`;
  }

  const res = await db.query<ScheduledEmailRecord>(sql, params);
  return res.rows;
}

export async function getScheduledEmailById(
  id: string
): Promise<ScheduledEmailRecord | null> {
  const db = await getDb();
  const res = await db.query<ScheduledEmailRecord>(
    `SELECT * FROM scheduled_emails WHERE id = $1 LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
}

export async function updateScheduledEmailStatus(
  id: string,
  status: ScheduledEmailRecord['status'],
  extra?: { errorMessage?: string; bullJobId?: string; scheduledAt?: string }
): Promise<void> {
  const db = await getDb();
  if (extra?.scheduledAt) {
    await db.query(
      `UPDATE scheduled_emails SET status = $1, scheduled_at = $2, error_message = $3 WHERE id = $4;`,
      [status, extra.scheduledAt, extra.errorMessage || null, id]
    );
  } else {
    await db.query(
      `UPDATE scheduled_emails SET status = $1, error_message = $2 WHERE id = $3;`,
      [status, extra?.errorMessage || null, id]
    );
  }
}

export async function deleteScheduledEmail(id: string): Promise<boolean> {
  const db = await getDb();
  const res = await db.query(`DELETE FROM scheduled_emails WHERE id = $1;`, [id]);
  return (res.affectedRows || 0) > 0;
}

// ----------------- Sent Emails -----------------
export async function recordSentEmail(email: SentEmailRecord): Promise<void> {
  const db = await getDb();
  await db.query(
    `INSERT INTO sent_emails (id, campaign_id, sender_email, recipient_email, subject, body, scheduled_at, sent_at, status, ethereal_preview_url, message_id, error_message, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       sent_at = EXCLUDED.sent_at,
       ethereal_preview_url = EXCLUDED.ethereal_preview_url,
       error_message = EXCLUDED.error_message;`,
    [
      email.id,
      email.campaign_id || null,
      email.sender_email,
      email.recipient_email,
      email.subject,
      email.body,
      email.scheduled_at,
      email.sent_at,
      email.status,
      email.ethereal_preview_url || null,
      email.message_id || null,
      email.error_message || null,
      email.created_at,
    ]
  );

  // Update scheduled email record to 'sent' or remove from pending
  await updateScheduledEmailStatus(email.id, email.status === 'sent' ? 'sent' : 'failed');
}

export async function getSentEmails(options?: {
  sender?: string;
  limit?: number;
}): Promise<SentEmailRecord[]> {
  const db = await getDb();
  let sql = `SELECT * FROM sent_emails WHERE 1=1`;
  const params: unknown[] = [];

  if (options?.sender) {
    params.push(options.sender);
    sql += ` AND sender_email = $${params.length}`;
  }

  sql += ` ORDER BY sent_at DESC`;

  if (options?.limit) {
    params.push(options.limit);
    sql += ` LIMIT $${params.length}`;
  }

  const res = await db.query<SentEmailRecord>(sql, params);
  return res.rows;
}

export async function getSentEmailById(id: string): Promise<SentEmailRecord | null> {
  const db = await getDb();
  const res = await db.query<SentEmailRecord>(
    `SELECT * FROM sent_emails WHERE id = $1 LIMIT 1;`,
    [id]
  );
  return res.rows[0] || null;
}

// ----------------- Elasticsearch-grade Search -----------------
export async function searchAllEmails(
  query: string,
  filter?: { status?: string; sender?: string }
): Promise<{
  scheduled: ScheduledEmailRecord[];
  sent: SentEmailRecord[];
  totalMatches: number;
}> {
  const db = await getDb();
  const cleanQ = `%${query.trim().toLowerCase()}%`;

  // Search scheduled emails
  const schedRes = await db.query<ScheduledEmailRecord>(
    `SELECT * FROM scheduled_emails 
     WHERE (LOWER(recipient_email) LIKE $1 
        OR LOWER(subject) LIKE $1 
        OR LOWER(body) LIKE $1 
        OR LOWER(sender_email) LIKE $1)
     ORDER BY scheduled_at ASC
     LIMIT 50;`,
    [cleanQ]
  );

  // Search sent emails
  const sentRes = await db.query<SentEmailRecord>(
    `SELECT * FROM sent_emails 
     WHERE (LOWER(recipient_email) LIKE $1 
        OR LOWER(subject) LIKE $1 
        OR LOWER(body) LIKE $1 
        OR LOWER(sender_email) LIKE $1)
     ORDER BY sent_at DESC
     LIMIT 50;`,
    [cleanQ]
  );

  let scheduled = schedRes.rows;
  let sent = sentRes.rows;

  if (filter?.sender) {
    scheduled = scheduled.filter((e) => e.sender_email === filter.sender);
    sent = sent.filter((e) => e.sender_email === filter.sender);
  }
  if (filter?.status && filter.status !== 'all') {
    if (filter.status === 'sent' || filter.status === 'failed') {
      scheduled = [];
      sent = sent.filter((e) => e.status === filter.status);
    } else {
      sent = [];
      scheduled = scheduled.filter((e) => e.status === filter.status);
    }
  }

  return {
    scheduled,
    sent,
    totalMatches: scheduled.length + sent.length,
  };
}

// ----------------- Slack Integration -----------------
export async function getSlackConfig(): Promise<SlackConfig> {
  const db = await getDb();
  const res = await db.query<{
    id: string;
    webhook_url: string;
    bot_token: string;
    channel: string;
    is_connected: boolean;
    last_notified_at: string;
  }>(`SELECT * FROM slack_integrations WHERE id = 'default' LIMIT 1;`);

  if (res.rows.length === 0) {
    return {
      webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
      botToken: process.env.SLACK_BOT_TOKEN || '',
      channel: '#email-alerts',
      isConnected: Boolean(process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN),
    };
  }

  const row = res.rows[0];
  return {
    webhookUrl: row.webhook_url,
    botToken: row.bot_token,
    channel: row.channel || '#email-alerts',
    isConnected: row.is_connected,
    lastNotifiedAt: row.last_notified_at,
  };
}

export async function saveSlackConfig(config: Partial<SlackConfig>): Promise<SlackConfig> {
  const db = await getDb();
  const current = await getSlackConfig();
  const updated: SlackConfig = {
    webhookUrl: config.webhookUrl !== undefined ? config.webhookUrl : current.webhookUrl,
    botToken: config.botToken !== undefined ? config.botToken : current.botToken,
    channel: config.channel !== undefined ? config.channel : current.channel,
    isConnected: config.isConnected !== undefined ? config.isConnected : true,
    lastNotifiedAt: config.lastNotifiedAt !== undefined ? config.lastNotifiedAt : current.lastNotifiedAt,
  };

  await db.query(
    `INSERT INTO slack_integrations (id, webhook_url, bot_token, channel, is_connected, last_notified_at, created_at)
     VALUES ('default', $1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET
       webhook_url = EXCLUDED.webhook_url,
       bot_token = EXCLUDED.bot_token,
       channel = EXCLUDED.channel,
       is_connected = EXCLUDED.is_connected,
       last_notified_at = EXCLUDED.last_notified_at;`,
    [
      updated.webhookUrl,
      updated.botToken || null,
      updated.channel || null,
      updated.isConnected,
      updated.lastNotifiedAt || null,
      new Date().toISOString(),
    ]
  );

  return updated;
}

// ----------------- Rate Limits In Relational DB -----------------
export async function recordRateLimitHitInDb(
  senderEmail: string,
  hourWindow: string,
  maxLimit: number,
  rescheduledCount = 1
): Promise<void> {
  const db = await getDb();
  const id = `${senderEmail}:${hourWindow}`;
  await db.query(
    `INSERT INTO sender_rate_limits (id, sender_email, hour_window, sent_count, max_limit, rescheduled_count, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       rescheduled_count = sender_rate_limits.rescheduled_count + EXCLUDED.rescheduled_count,
       updated_at = EXCLUDED.updated_at;`,
    [id, senderEmail, hourWindow, maxLimit, maxLimit, rescheduledCount, new Date().toISOString()]
  );
}

export async function getSenderRateLimits(): Promise<SenderRateLimitInfo[]> {
  const db = await getDb();
  const now = new Date();
  const currentWindow = now.toISOString().slice(0, 13).replace('T', ' ') + ':00';
  const minutesLeft = 60 - now.getMinutes();

  const res = await db.query<{
    sender_email: string;
    hour_window: string;
    sent_count: number;
    max_limit: number;
    rescheduled_count: number;
  }>(`SELECT * FROM sender_rate_limits ORDER BY updated_at DESC LIMIT 10;`);

  return res.rows.map((row) => ({
    senderEmail: row.sender_email,
    hourWindow: row.hour_window,
    sentCount: row.sent_count,
    maxLimit: row.max_limit,
    rescheduledCount: row.rescheduled_count,
    isLimitReached: row.sent_count >= row.max_limit,
    resetsInMinutes: minutesLeft,
  }));
}

export async function getDatabaseStats(): Promise<{
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalCampaigns: number;
}> {
  const db = await getDb();
  const schedRes = await db.query<{ count: number }>(
    `SELECT count(*) as count FROM scheduled_emails WHERE status IN ('scheduled', 'processing', 'delayed');`
  );
  const sentRes = await db.query<{ count: number }>(
    `SELECT count(*) as count FROM sent_emails WHERE status = 'sent';`
  );
  const failRes = await db.query<{ count: number }>(
    `SELECT count(*) as count FROM sent_emails WHERE status = 'failed';`
  );
  const campRes = await db.query<{ count: number }>(
    `SELECT count(*) as count FROM campaigns;`
  );

  return {
    totalScheduled: Number(schedRes.rows[0]?.count || 0),
    totalSent: Number(sentRes.rows[0]?.count || 0),
    totalFailed: Number(failRes.rows[0]?.count || 0),
    totalCampaigns: Number(campRes.rows[0]?.count || 0),
  };
}
