import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { format } from 'date-fns';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createPaymentIntent(invoiceId: string, guestBookingId?: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { booking: { include: { guest: true } } },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (guestBookingId && invoice.bookingId !== guestBookingId) {
      throw new ForbiddenException();
    }
    if (Number(invoice.balanceDue) <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const amountInCents = Math.round(Number(invoice.balanceDue) * 100);

    const intent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        guestEmail: invoice.booking.guest.email,
      },
      automatic_payment_methods: { enabled: true },
    });

    return { clientSecret: intent.client_secret };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
    }

    return { received: true };
  }

  async getPaymentsForInvoice(invoiceId: string, guestBookingId?: string) {
    if (guestBookingId) {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { bookingId: true },
      });
      if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
      if (invoice.bookingId !== guestBookingId) throw new ForbiddenException();
    }
    return this.prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        invoice: {
          include: { booking: { include: { guest: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
    const { invoiceId } = intent.metadata;
    if (!invoiceId) return;

    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return;

    const paymentNumber = await this.generatePaymentNumber();
    const amount = intent.amount / 100;

    await this.prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId,
        amount,
        method: 'CREDIT_CARD' as any,
        status: 'COMPLETED' as any,
        stripePaymentId: intent.id,
        processedAt: new Date(),
      },
    });

    const newPaid = Number(invoice.paidAmount) + amount;
    const newBalance = Math.max(0, Number(invoice.totalAmount) - newPaid);
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        status: newStatus as any,
        ...(newBalance <= 0 && { paidAt: new Date() }),
      },
    });
  }

  private async generatePaymentNumber(): Promise<string> {
    const datePart = format(new Date(), 'yyyyMMdd');
    const prefix = `PAY-${datePart}-`;
    const latest = await this.prisma.payment.findFirst({
      where: { paymentNumber: { startsWith: prefix } },
      orderBy: { paymentNumber: 'desc' },
    });
    const nextSeq = latest
      ? parseInt(latest.paymentNumber.split('-').pop() ?? '0', 10) + 1
      : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
