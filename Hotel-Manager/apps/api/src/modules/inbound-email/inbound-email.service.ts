import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

const RESEND_API = 'https://api.resend.com';
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  reply_to?: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  created_at: string;
}

interface ReceivedAttachment {
  filename: string;
  content_type: string;
  content_disposition: string | null;
  content_id: string | null;
  download_url: string;
}

/**
 * Forwards mail received on the domain (stay@cestlastay.com) to the team.
 *
 * Flow: Resend receives the mail -> POSTs `email.received` to our webhook ->
 * we verify the Svix signature, fetch the full email + attachments from the
 * Resend API, and re-send it to RESEND_FORWARD_TO with Reply-To set to the
 * original sender, so hitting "Reply" in Gmail answers the guest directly.
 */
@Injectable()
export class InboundEmailService {
  private readonly logger = new Logger(InboundEmailService.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  private readonly forwardTo: string[];
  private readonly forwardFrom: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY') ?? '';
    this.webhookSecret = config.get<string>('RESEND_WEBHOOK_SECRET') ?? '';
    this.forwardTo = (config.get<string>('RESEND_FORWARD_TO') ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    this.forwardFrom =
      config.get<string>('RESEND_FORWARD_FROM') ??
      "C'est La Stay Inbox <stay@cestlastay.com>";

    if (!this.apiKey || !this.webhookSecret || this.forwardTo.length === 0) {
      this.logger.warn(
        'Inbound email forwarding disabled: set RESEND_API_KEY, RESEND_WEBHOOK_SECRET and RESEND_FORWARD_TO',
      );
    }
  }

  async handleWebhook(rawBody: Buffer | undefined, headers: Record<string, string | undefined>) {
    if (!rawBody) throw new BadRequestException('Missing body');
    this.verifySignature(rawBody, headers);

    const event = JSON.parse(rawBody.toString('utf8')) as {
      type: string;
      data?: { email_id?: string };
    };

    if (event.type !== 'email.received') return { ignored: event.type };
    const emailId = event.data?.email_id;
    if (!emailId) throw new BadRequestException('Missing email_id');

    if (!this.apiKey || this.forwardTo.length === 0) {
      this.logger.warn(`Received email ${emailId} but forwarding is not configured`);
      return { forwarded: false };
    }

    await this.forward(emailId);
    return { forwarded: true };
  }

  /** Svix signature check: HMAC-SHA256 over `${id}.${timestamp}.${body}`. */
  private verifySignature(rawBody: Buffer, headers: Record<string, string | undefined>) {
    const id = headers['svix-id'];
    const timestamp = headers['svix-timestamp'];
    const signatureHeader = headers['svix-signature'];
    if (!this.webhookSecret) throw new UnauthorizedException('Webhook secret not configured');
    if (!id || !timestamp || !signatureHeader) {
      throw new UnauthorizedException('Missing signature headers');
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > SIGNATURE_TOLERANCE_SECONDS) {
      throw new UnauthorizedException('Stale webhook timestamp');
    }

    const secret = Buffer.from(this.webhookSecret.replace(/^whsec_/, ''), 'base64');
    const expected = createHmac('sha256', secret)
      .update(`${id}.${timestamp}.${rawBody.toString('utf8')}`)
      .digest();

    const valid = signatureHeader.split(' ').some((part) => {
      const [version, sig] = part.split(',');
      if (version !== 'v1' || !sig) return false;
      const given = Buffer.from(sig, 'base64');
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
    if (!valid) throw new UnauthorizedException('Invalid webhook signature');
  }

  private async forward(emailId: string) {
    const email = await this.resendGet<ReceivedEmail>(`/emails/receiving/${emailId}`);
    const attachments = await this.resendGet<{ data: ReceivedAttachment[] }>(
      `/emails/receiving/${emailId}/attachments`,
    ).then((r) => r.data ?? []);

    const subject = email.subject?.trim() || '(no subject)';
    const header = [
      `<b>From:</b> ${escapeHtml(email.from)}`,
      `<b>To:</b> ${escapeHtml(email.to.join(', '))}`,
      email.cc?.length ? `<b>Cc:</b> ${escapeHtml(email.cc.join(', '))}` : '',
      `<b>Date:</b> ${escapeHtml(new Date(email.created_at).toUTCString())}`,
      `<b>Subject:</b> ${escapeHtml(subject)}`,
    ]
      .filter(Boolean)
      .join('<br>');

    const body =
      email.html ??
      `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(email.text ?? '')}</pre>`;

    const html =
      `<div style="font-family:Arial,sans-serif;font-size:13px;color:#555;border-left:3px solid #ccc;padding:4px 12px;margin-bottom:16px">` +
      `---------- Forwarded message to stay@ ----------<br>${header}</div>${body}`;

    const replyTo = email.reply_to?.length ? email.reply_to : [email.from];

    const res = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        // Resend retries webhooks; this stops duplicate forwards of the same mail.
        'Idempotency-Key': `inbound-forward-${emailId}`,
      },
      body: JSON.stringify({
        from: this.forwardFrom,
        to: this.forwardTo,
        reply_to: replyTo,
        subject: `[stay@] ${subject}`,
        html,
        text: email.text ?? undefined,
        attachments: attachments.map((a) => ({
          filename: a.filename,
          path: a.download_url,
          content_type: a.content_type,
          ...(a.content_id ? { content_id: a.content_id } : {}),
        })),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      this.logger.error(`Forward of ${emailId} failed: ${res.status} ${detail}`);
      // Non-2xx makes Resend retry the webhook later.
      throw new Error(`Resend send failed with ${res.status}`);
    }
    this.logger.log(`Forwarded inbound email ${emailId} from ${email.from} to ${this.forwardTo.length} recipients`);
  }

  private async resendGet<T>(path: string): Promise<T> {
    const res = await fetch(`${RESEND_API}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Resend GET ${path} failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as T;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
