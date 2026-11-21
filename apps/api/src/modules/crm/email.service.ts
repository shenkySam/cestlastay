import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export type EmailType =
  | 'WELCOME'
  | 'BOOKING_CONFIRMATION'
  | 'CHECK_IN_REMINDER'
  | 'CHECK_OUT_THANK_YOU'
  | 'LOYALTY_DISCOUNT'
  | 'PROMOTIONAL'
  | 'PASSWORD_RESET'
  | 'GUEST_LOGIN_CODE';

interface SendEmailParams {
  to: string;
  toName?: string;
  type: EmailType;
  subject: string;
  html: string;
  /** Extra MIME headers, e.g. List-Unsubscribe on marketing email */
  headers?: Record<string, string>;
  /**
   * Stored in email_logs instead of `html`, for emails that carry a secret
   * (sign-in codes) which must not sit in the database in plain text.
   */
  logBody?: string;
  /** Stored and logged instead of `subject`, for the same reason as logBody. */
  logSubject?: string;
  /** Printed with the stub-mode log line (no Resend key), outside production only. */
  devNote?: string;
}

const RESEND_API = 'https://api.resend.com';
const DEFAULT_FROM = "C'est La Stay <stay@cestlastay.com>";

/**
 * Outbound transactional email through Resend — the same account (and
 * verified cestlastay.com domain) that handles inbound stay@ forwarding.
 * Without RESEND_API_KEY it runs in stub mode: the email is logged to
 * email_logs and the console but not sent.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('RESEND_API_KEY') ?? '';
    this.from = this.config.get<string>('EMAIL_FROM') || DEFAULT_FROM;
    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not configured — emails will be logged only.');
    }
  }

  async send(params: SendEmailParams) {
    const log = await this.prisma.emailLog.create({
      data: {
        recipientEmail: params.to,
        recipientName: params.toName,
        type: params.type as any,
        status: 'QUEUED' as any,
        subject: params.logSubject ?? params.subject,
        body: params.logBody ?? params.html,
      },
    });

    if (!this.apiKey) {
      // Stub mode: mark as sent so the log reflects "would have sent".
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT' as any, sentAt: new Date() },
      });
      const note =
        params.devNote && process.env.NODE_ENV !== 'production' ? ` :: ${params.devNote}` : '';
      this.logger.log(`[STUB EMAIL] ${params.type} → ${params.to} :: ${params.logSubject ?? params.subject}${note}`);
      return log;
    }

    try {
      const res = await fetch(`${RESEND_API}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // A retried send of the same log row is delivered once.
          'Idempotency-Key': `email-log-${log.id}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          ...(params.headers && { headers: params.headers }),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok) throw new Error(data.message || `Resend responded ${res.status}`);

      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT' as any, sentAt: new Date(), providerMessageId: data.id },
      });
      return log;
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Unknown error';
      this.logger.error(`Email failure (${params.type} → ${params.to}): ${errorMessage}`);
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED' as any, errorMessage },
      });
      return log;
    }
  }
}
