export type EmailStatus = 'scheduled' | 'processing' | 'delayed' | 'sent' | 'failed';

export interface EmailJobData {
  emailId: string;
  campaignId?: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  delayBetweenSendsSec: number;
  hourlyLimit: number;
  scheduledAt: string; // ISO string
  attempt: number;
}

export interface ScheduledEmailRecord {
  id: string;
  campaign_id?: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  scheduled_at: string;
  status: EmailStatus;
  bull_job_id?: string;
  delay_seconds: number;
  hourly_limit: number;
  attempt_count: number;
  error_message?: string;
  created_at: string;
}

export interface SentEmailRecord {
  id: string;
  campaign_id?: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
  scheduled_at: string;
  sent_at: string;
  status: 'sent' | 'failed';
  ethereal_preview_url?: string;
  message_id?: string;
  error_message?: string;
  created_at: string;
}

export interface CampaignRecord {
  id: string;
  title: string;
  sender_email: string;
  subject: string;
  body: string;
  start_time: string;
  delay_seconds: number;
  hourly_limit: number;
  total_leads: number;
  sent_count: number;
  failed_count: number;
  status: 'scheduled' | 'running' | 'completed' | 'paused';
  created_at: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  paused: boolean;
  concurrency: number;
  minDelaySec: number;
  maxHourlyLimit: number;
  redisConnected: boolean;
}

export interface SlackConfig {
  webhookUrl: string;
  botToken?: string;
  channel?: string;
  isConnected: boolean;
  lastNotifiedAt?: string;
}

export interface SenderRateLimitInfo {
  senderEmail: string;
  hourWindow: string; // e.g. "2026-10-07 08:00"
  sentCount: number;
  maxLimit: number;
  rescheduledCount: number;
  isLimitReached: boolean;
  resetsInMinutes: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
}
