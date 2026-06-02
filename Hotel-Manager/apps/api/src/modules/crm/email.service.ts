import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';
import { PrismaService } from '../../prisma/prisma.service';

export type EmailType =
  | 'WELCOME'
  | 'BOOKING_CONFIRMATION'
  | 'CHECK_IN_REMINDER'
  | 'CHECK_OUT_THANK_YOU'
  | 'LOYALTY_DISCOUNT'
  | 'PROMOTIONAL'
  | 'PASSWORD_RESET';

interface SendEmailParams {
  to: string;
  toName?: string;
  type: EmailType;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly enabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY') ?? '';
    this.fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL') ?? 'noreply@hotel.local';
    this.fromName = this.config.get<string>('SENDGRID_FROM_NAME') ?? 'Hotel Manager';
    this.enabled = apiKey.startsWith('SG.');
    if (this.enabled) {
      sgMail.setApiKey(apiKey);
    } else {
      this.logger.warn('SENDGRID_API_KEY not configured — emails will be logged only.');
    }
  }

  async send(params: SendEmailParams) {
    const log = await this.prisma.emailLog.create({
      data: {
        recipientEmail: params.to,
        recipientName: params.toName,
        type: params.type as any,
        status: 'QUEUED' as any,
        subject: params.subject,
        body: params.html,
      },
    });

    if (!this.enabled) {
      // Stub mode: mark as sent so the log reflects "would have sent".
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'SENT' as any, sentAt: new Date() },
      });
      this.logger.log(`[STUB EMAIL] ${params.type} → ${params.to} :: ${params.subject}`);
      return log;
    }

    try {
      const [response] = await sgMail.send({
        to: { email: params.to, name: params.toName },
        from: { email: this.fromEmail, name: this.fromName },
        subject: params.subject,
        html: params.html,
      });
      const sgId = response.headers['x-message-id'] as string | undefined;
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: 'SENT' as any,
          sentAt: new Date(),
          sendgridId: sgId,
        },
      });
      return log;
    } catch (err: any) {
      const errorMessage = err?.response?.body?.errors?.[0]?.message ?? err?.message ?? 'Unknown error';
      this.logger.error(`SendGrid failure (${params.type} → ${params.to}): ${errorMessage}`);
      await this.prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'FAILED' as any, errorMessage },
      });
      return log;
    }
  }
}
