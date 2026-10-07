import { createHmac, timingSafeEqual } from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addDays, endOfDay, format, startOfDay } from 'date-fns';
import { customAlphabet } from 'nanoid';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import {
  bookingConfirmationTemplate,
  checkInReminderTemplate,
  postStayDiscountTemplate,
} from './email-templates';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { SubscribeDto } from './dto/subscribe.dto';

const codeGen = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── Triggers ──────────────────────────────────────────────────

  async sendBookingConfirmation(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, rooms: { include: { room: { include: { category: true } } } } },
    });
    if (!booking) return;

    const { subject, html } = bookingConfirmationTemplate({
      guestFirstName: booking.guest.firstName,
      guestLastName: booking.guest.lastName,
      bookingNumber: booking.bookingNumber,
      roomNumber: booking.rooms.map((r) => r.room.roomNumber).join(', '),
      roomCategory: [...new Set(booking.rooms.map((r) => r.room.category.name))].join(', '),
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalAmount: Number(booking.totalAmount),
      portalUrl: this.frontendUrl() + '/login?as=guest',
    });

    return this.email.send({
      to: booking.guest.email,
      toName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      type: 'BOOKING_CONFIRMATION',
      subject,
      html,
    });
  }

  async sendCheckInReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true, rooms: { include: { room: { include: { category: true } } } } },
    });
    if (!booking) return;

    const { subject, html } = checkInReminderTemplate({
      guestFirstName: booking.guest.firstName,
      guestLastName: booking.guest.lastName,
      bookingNumber: booking.bookingNumber,
      roomNumber: booking.rooms.map((r) => r.room.roomNumber).join(', '),
      roomCategory: [...new Set(booking.rooms.map((r) => r.room.category.name))].join(', '),
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      totalAmount: Number(booking.totalAmount),
      portalUrl: this.frontendUrl() + '/login?as=guest',
    });

    return this.email.send({
      to: booking.guest.email,
      toName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      type: 'CHECK_IN_REMINDER',
      subject,
      html,
    });
  }

  async sendPostStayDiscount(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { guest: true },
    });
    if (!booking) return;

    // Points are earned by the stay, whether or not the guest takes offers
    await this.prisma.guest.update({
      where: { id: booking.guestId },
      data: { loyaltyPoints: { increment: 100 } },
    });

    // This email is marketing: none (and no code) for guests who unsubscribed
    if (await this.isOptedOut(booking.guest.email)) return;

    // Generate a unique loyalty discount code for this guest
    const code = `LOYAL-${codeGen()}`;
    const discountValue = 10; // 10% off
    const validUntil = addDays(new Date(), 90);

    const discount = await this.prisma.loyaltyDiscount.create({
      data: {
        code,
        description: `Loyalty thank-you for ${booking.guest.firstName} ${booking.guest.lastName} (${booking.bookingNumber})`,
        discountType: 'PERCENTAGE',
        discountValue,
        validFrom: new Date(),
        validUntil,
        maxUses: 1,
        isActive: true,
      },
    });

    const { subject, html } = postStayDiscountTemplate({
      guestFirstName: booking.guest.firstName,
      bookingNumber: booking.bookingNumber,
      code: discount.code,
      discountLabel: `${discountValue}% off your next stay`,
      validUntil: discount.validUntil,
      unsubscribeUrl: this.unsubscribeUrl(booking.guest.email),
    });

    return this.email.send({
      to: booking.guest.email,
      toName: `${booking.guest.firstName} ${booking.guest.lastName}`,
      type: 'LOYALTY_DISCOUNT',
      subject,
      html,
      headers: this.oneClickUnsubscribeHeaders(booking.guest.email),
    });
  }

  // ── Scheduled jobs ────────────────────────────────────────────

  // Daily at 9am: send check-in reminder for bookings starting tomorrow
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailyCheckInReminders() {
    const tomorrowStart = startOfDay(addDays(new Date(), 1));
    const tomorrowEnd = endOfDay(addDays(new Date(), 1));

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED' as any,
        checkInDate: { gte: tomorrowStart, lte: tomorrowEnd },
      },
      select: { id: true, bookingNumber: true },
    });

    this.logger.log(`Sending check-in reminders for ${bookings.length} booking(s).`);
    for (const b of bookings) {
      await this.sendCheckInReminder(b.id);
    }
  }

  // Daily at 11am: 24h after checkout, send loyalty discount
  @Cron(CronExpression.EVERY_DAY_AT_11AM)
  async runDailyPostStayEmails() {
    const yesterdayStart = startOfDay(addDays(new Date(), -1));
    const yesterdayEnd = endOfDay(addDays(new Date(), -1));

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CHECKED_OUT' as any,
        actualCheckOutAt: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      select: { id: true, bookingNumber: true, guestId: true },
    });

    // Skip guests who already received a LOYALTY_DISCOUNT email recently
    const recentLoyalty = await this.prisma.emailLog.findMany({
      where: {
        type: 'LOYALTY_DISCOUNT' as any,
        createdAt: { gte: addDays(new Date(), -2) },
      },
      select: { recipientEmail: true },
    });
    const seen = new Set(recentLoyalty.map((e) => e.recipientEmail.toLowerCase()));

    let sent = 0;
    for (const b of bookings) {
      const guest = await this.prisma.guest.findUnique({ where: { id: b.guestId } });
      if (!guest || seen.has(guest.email.toLowerCase())) continue;
      await this.sendPostStayDiscount(b.id);
      sent += 1;
    }
    this.logger.log(`Sent ${sent} post-stay loyalty email(s).`);
  }

  // ── Email logs ────────────────────────────────────────────────

  async listEmails(filters?: { type?: string; status?: string; search?: string }) {
    return this.prisma.emailLog.findMany({
      where: {
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.search && {
          OR: [
            { recipientEmail: { contains: filters.search, mode: 'insensitive' } },
            { subject: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getEmailStats() {
    const [total, sent, failed, queued] = await Promise.all([
      this.prisma.emailLog.count(),
      this.prisma.emailLog.count({ where: { status: 'SENT' as any } }),
      this.prisma.emailLog.count({ where: { status: 'FAILED' as any } }),
      this.prisma.emailLog.count({ where: { status: 'QUEUED' as any } }),
    ]);
    const byType = await this.prisma.emailLog.groupBy({
      by: ['type'],
      _count: { _all: true },
    });
    return { total, sent, failed, queued, byType };
  }

  // ── Discount codes ────────────────────────────────────────────

  async listDiscounts() {
    return this.prisma.loyaltyDiscount.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiscount(dto: CreateDiscountDto) {
    if (!['PERCENTAGE', 'FIXED'].includes(dto.discountType)) {
      throw new BadRequestException('discountType must be PERCENTAGE or FIXED');
    }
    const code = (dto.code ?? `PROMO-${codeGen()}`).toUpperCase();
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validUntil = new Date(dto.validUntil);
    if (validUntil <= validFrom) {
      throw new BadRequestException('validUntil must be after validFrom');
    }

    return this.prisma.loyaltyDiscount.create({
      data: {
        code,
        description: dto.description,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minStays: dto.minStays,
        validFrom,
        validUntil,
        maxUses: dto.maxUses,
        isActive: true,
      },
    });
  }

  async toggleDiscount(id: string, isActive: boolean) {
    const existing = await this.prisma.loyaltyDiscount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Discount ${id} not found`);
    return this.prisma.loyaltyDiscount.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteDiscount(id: string) {
    const existing = await this.prisma.loyaltyDiscount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Discount ${id} not found`);
    await this.prisma.loyaltyDiscount.delete({ where: { id } });
    return { message: 'Discount deleted' };
  }

  // ── Newsletter ────────────────────────────────────────────────

  async subscribe(dto: SubscribeDto) {
    const email = dto.email.trim().toLowerCase();
    const [subscriber] = await this.prisma.$transaction([
      this.prisma.newsletterSubscriber.upsert({
        where: { email },
        update: {},
        create: { email, source: dto.source ?? 'guest-footer' },
      }),
      // Subscribing again is fresh consent: lift an earlier opt-out
      this.prisma.marketingOptOut.deleteMany({ where: { email } }),
    ]);
    return { ok: true, id: subscriber.id };
  }

  async listSubscribers() {
    return this.prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  // ── Unsubscribe ───────────────────────────────────────────────

  /**
   * Opt an email out of marketing (post-stay offers + newsletter). The token
   * from the email's link is the only auth, so the endpoint is public.
   */
  async unsubscribe(email: string | undefined, token: string | undefined) {
    const normalized = (email ?? '').trim().toLowerCase();
    if (!normalized || !token || !this.isValidUnsubscribeToken(normalized, token)) {
      throw new BadRequestException('This unsubscribe link is invalid.');
    }
    await this.prisma.$transaction([
      this.prisma.marketingOptOut.upsert({
        where: { email: normalized },
        update: {},
        create: { email: normalized },
      }),
      this.prisma.newsletterSubscriber.deleteMany({ where: { email: normalized } }),
    ]);
    return { ok: true, email: normalized };
  }

  private async isOptedOut(email: string) {
    const row = await this.prisma.marketingOptOut.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    return row !== null;
  }

  // HMAC of the email, so links can't be forged for other addresses. Falls back
  // to JWT_SECRET; set UNSUBSCRIBE_SECRET to rotate that without breaking links.
  private unsubscribeToken(email: string) {
    const secret =
      this.config.get<string>('UNSUBSCRIBE_SECRET') || this.config.getOrThrow<string>('JWT_SECRET');
    return createHmac('sha256', secret)
      .update(`unsubscribe:${email.trim().toLowerCase()}`)
      .digest('base64url');
  }

  private isValidUnsubscribeToken(email: string, token: string) {
    const expected = Buffer.from(this.unsubscribeToken(email));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
  }

  private unsubscribeQuery(email: string) {
    return new URLSearchParams({
      e: email.trim().toLowerCase(),
      t: this.unsubscribeToken(email),
    }).toString();
  }

  // The footer link opens a confirmation page in the web app; a GET must not
  // unsubscribe by itself, since mail scanners prefetch links.
  private unsubscribeUrl(email: string) {
    return `${this.frontendUrl()}/unsubscribe?${this.unsubscribeQuery(email)}`;
  }

  // RFC 8058 one-click unsubscribe: mail clients POST straight to the API.
  // Needs the API's public host, which Railway injects; omitted elsewhere.
  private oneClickUnsubscribeHeaders(email: string): Record<string, string> | undefined {
    const domain = this.config.get<string>('RAILWAY_PUBLIC_DOMAIN');
    if (!domain) return undefined;
    return {
      'List-Unsubscribe': `<https://${domain}/api/v1/crm/unsubscribe?${this.unsubscribeQuery(email)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  // ── Helpers ───────────────────────────────────────────────────

  private frontendUrl() {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  }

  // Used by tests / manual triggers from the admin UI
  describeTriggers() {
    return [
      { event: 'booking.created', emails: ['BOOKING_CONFIRMATION'] },
      { event: 'booking.checked_in', emails: [] },
      { event: 'booking.checked_out', emails: [] },
      { event: 'cron.daily_9am', emails: ['CHECK_IN_REMINDER (T-1)'] },
      { event: 'cron.daily_11am', emails: ['LOYALTY_DISCOUNT (T+1 after checkout)'] },
    ];
  }
}
