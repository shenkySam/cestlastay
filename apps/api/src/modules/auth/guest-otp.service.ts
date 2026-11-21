import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../crm/email.service';
import { guestLoginCodeTemplate } from '../crm/email-templates';

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_COOLDOWN_MS = 60_000;
export const OTP_MAX_ATTEMPTS = 5;
export const HANDOFF_TTL_MS = 60_000;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Issues and checks guest sign-in codes (see the GuestLoginCode model).
 * Deciding *which* booking a guest may enter stays in AuthService.
 */
@Injectable()
export class GuestOtpService {
  private readonly logger = new Logger(GuestOtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Email a fresh 6-digit code to `email`, replacing any earlier one. Silently
   * does nothing while the previous code is younger than the cooldown.
   * Returns whether a code was sent.
   */
  async sendOtp(rawEmail: string, opts: { bookingId?: string; firstName?: string } = {}) {
    const email = normalizeEmail(rawEmail);
    const now = Date.now();

    const latest = await this.prisma.guestLoginCode.findFirst({
      where: { email, purpose: 'OTP' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latest && now - latest.createdAt.getTime() < OTP_COOLDOWN_MS) return false;

    // One live code per email: a new request retires the old ones.
    await this.prisma.guestLoginCode.updateMany({
      where: { email, purpose: 'OTP', consumedAt: null },
      data: { consumedAt: new Date(now) },
    });

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.guestLoginCode.create({
      data: {
        email,
        purpose: 'OTP',
        codeHash: this.hash(`otp:${email}:${code}`),
        bookingId: opts.bookingId,
        expiresAt: new Date(now + OTP_TTL_MS),
      },
    });

    const tpl = guestLoginCodeTemplate({
      guestFirstName: opts.firstName,
      code,
      minutes: OTP_TTL_MS / 60_000,
    });
    await this.email.send({
      to: email,
      type: 'GUEST_LOGIN_CODE',
      subject: tpl.subject,
      html: tpl.html,
      logSubject: tpl.logSubject,
      logBody: tpl.logBody,
      devNote: `code ${code}`,
    });
    return true;
  }

  /**
   * Check a code. Every attempt counts against the code, whether right or
   * wrong; a correct one is consumed. Returns the row (with the booking it was
   * issued for, if any) or null.
   */
  async verifyOtp(rawEmail: string, code: string) {
    const email = normalizeEmail(rawEmail);
    const row = await this.prisma.guestLoginCode.findFirst({
      where: { email, purpose: 'OTP', consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) return null;

    // Claim an attempt atomically so parallel guesses can't exceed the cap.
    const claimed = await this.prisma.guestLoginCode.updateMany({
      where: { id: row.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) return null;

    if (!/^\d{6}$/.test(code) || !this.matches(row.codeHash, `otp:${email}:${code}`)) {
      if (row.attempts + 1 >= OTP_MAX_ATTEMPTS) {
        await this.prisma.guestLoginCode.updateMany({
          where: { id: row.id, consumedAt: null },
          data: { consumedAt: new Date() },
        });
      }
      return null;
    }

    const consumed = await this.prisma.guestLoginCode.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1 ? row : null;
  }

  /** A single-use, short-lived code that the portal exchanges for a guest session. */
  async createHandoff(bookingId: string, rawEmail: string) {
    const code = randomBytes(32).toString('base64url');
    await this.prisma.guestLoginCode.create({
      data: {
        email: normalizeEmail(rawEmail),
        purpose: 'HANDOFF',
        codeHash: this.hash(`handoff:${code}`),
        bookingId,
        expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
      },
    });
    return code;
  }

  /** Consume a handoff code; returns the booking id it was issued for, or null. */
  async consumeHandoff(code: string) {
    if (typeof code !== 'string' || !code) return null;
    const row = await this.prisma.guestLoginCode.findFirst({
      where: {
        codeHash: this.hash(`handoff:${code}`),
        purpose: 'HANDOFF',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!row?.bookingId) return null;
    const consumed = await this.prisma.guestLoginCode.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return consumed.count === 1 ? row.bookingId : null;
  }

  /** Send without failing the caller (used right after a public booking). */
  sendOtpQuietly(email: string, opts: { bookingId?: string; firstName?: string }) {
    this.sendOtp(email, opts).catch((err) =>
      this.logger.error(`Could not send sign-in code: ${err?.message ?? err}`),
    );
  }

  private hash(value: string) {
    return createHmac('sha256', this.config.get<string>('JWT_SECRET') ?? '')
      .update(value)
      .digest('hex');
  }

  private matches(storedHex: string, value: string) {
    const a = Buffer.from(storedHex, 'hex');
    const b = Buffer.from(this.hash(value), 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
