import nodemailer from 'nodemailer';
import type { SentMessageInfo, Transporter } from 'nodemailer';

let transporterPromise: Promise<Transporter> | null = null;
let currentEtherealAccount: { user: string; pass: string; web?: string } | null = null;

export async function getMailerTransporter(): Promise<Transporter> {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    let user = process.env.ETHEREAL_USER;
    let pass = process.env.ETHEREAL_PASS;

    if (!user || !pass) {
      try {
        // Create an official Ethereal test account on the fly
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        currentEtherealAccount = {
          user: testAccount.user,
          pass: testAccount.pass,
          web: testAccount.web,
        };
      } catch (err) {
        console.warn('Failed to auto-create Ethereal account, using fallback test SMTP:', err);
        // Fallback test credentials
        user = 'reachinbox.test@ethereal.email';
        pass = 'testpassword123';
        currentEtherealAccount = { user, pass };
      }
    } else {
      currentEtherealAccount = { user, pass };
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    return transporter;
  })();

  return transporterPromise;
}

export function getEtherealAccountInfo() {
  return currentEtherealAccount;
}

export async function sendEtherealEmail(options: {
  from: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
}): Promise<{
  success: boolean;
  messageId: string;
  previewUrl: string | false;
  error?: string;
}> {
  try {
    const transporter = await getMailerTransporter();

    const info: SentMessageInfo = await transporter.sendMail({
      from: `"ReachInbox Outreach" <${options.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.body,
      html:
        options.html ||
        `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
            ReachInbox Distributed Outreach Engine · Test Ethereal Delivery
          </div>
          <div style="white-space: pre-wrap; font-size: 15px; line-height: 1.6;">${options.body}</div>
          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
            Sent by ReachInbox Email Job Scheduler · Simulated Cold Outreach
          </div>
        </div>`,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || false,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      messageId: '',
      previewUrl: false,
      error: errorMsg,
    };
  }
}
