import { getSlackConfig, saveSlackConfig } from './db';

export interface SlackRateLimitAlertPayload {
  senderEmail: string;
  hourlyLimit: number;
  currentCount: number;
  rescheduledCount: number;
  nextWindowTime: string;
  timestamp: string;
}

export async function sendSlackRateLimitNotification(
  alert: SlackRateLimitAlertPayload
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const config = await getSlackConfig();

    if (!config.isConnected || !config.webhookUrl) {
      return { sent: false, reason: 'Slack is not connected or webhook URL is missing.' };
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '⚠️ ReachInbox: Sender Rate Limit Exceeded',
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Hourly sending cap reached for sender:* \`${alert.senderEmail}\`\nIn accordance with provider throttling rules, jobs have been safely preserved and *delayed into the next available hour window* without job loss.`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Sender Account:*\n${alert.senderEmail}`,
          },
          {
            type: 'mrkdwn',
            text: `*Hourly Cap:*\n${alert.hourlyLimit} emails / hr`,
          },
          {
            type: 'mrkdwn',
            text: `*Current Hour Sends:*\n${alert.currentCount}`,
          },
          {
            type: 'mrkdwn',
            text: `*Rescheduled Jobs:*\n${alert.rescheduledCount} email(s)`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Next Sending Window:* ${alert.nextWindowTime} · *Triggered At:* ${alert.timestamp}`,
          },
        ],
      },
    ];

    const payload = {
      text: `⚠️ [ReachInbox Alert] Hourly rate limit reached for ${alert.senderEmail} (${alert.currentCount}/${alert.hourlyLimit}). Rescheduled to next hour.`,
      blocks,
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await saveSlackConfig({ lastNotifiedAt: new Date().toISOString() });
      return { sent: true };
    } else {
      const errText = await response.text();
      return { sent: false, reason: `Slack API error (${response.status}): ${errText}` };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { sent: false, reason: errorMsg };
  }
}

export async function sendSlackTestMessage(
  customWebhook?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getSlackConfig();
    const webhookUrl = customWebhook || config.webhookUrl;

    if (!webhookUrl) {
      return {
        success: false,
        message: 'No Slack Webhook URL provided. Please enter a valid Slack Incoming Webhook URL.',
      };
    }

    const payload = {
      text: '✅ [ReachInbox Alert System] Connection verified! You will receive instant notifications here when any sender hits their hourly email rate limit.',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚡ ReachInbox Scheduler: Slack Connected',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Real-time alert dispatch is active. If any cold outreach sender account exceeds their configured hourly limit, an alert will be published here with rescheduling details.',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Verified at: ${new Date().toLocaleString()} · Node: ReachInbox BullMQ Cluster`,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      await saveSlackConfig({
        webhookUrl,
        isConnected: true,
        lastNotifiedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: 'Test message sent successfully to Slack! Check your Slack channel.',
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        message: `Slack rejected webhook (${response.status}): ${errorText}`,
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Failed to contact Slack: ${errorMsg}` };
  }
}
