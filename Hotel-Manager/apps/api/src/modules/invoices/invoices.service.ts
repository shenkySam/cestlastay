import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { format } from 'date-fns';

const INVOICE_INCLUDE = {
  booking: {
    include: {
      guest: true,
      room: { include: { category: true } },
    },
  },
  items: true,
  payments: true,
} as const;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByBookingId(bookingId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { bookingId },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw new NotFoundException(`No invoice for booking ${bookingId}`);
    return invoice;
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async findAll() {
    return this.prisma.invoice.findMany({
      include: {
        booking: { include: { guest: true, room: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Auto-generate or retrieve invoice for a booking
  async generateForBooking(bookingId: string) {
    const existing = await this.prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) return this.findByBookingId(bookingId);

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { room: { include: { category: true } }, guest: true },
    });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);

    const nights = Math.ceil(
      (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const roomRate = Number(booking.roomRate);
    const subtotal = roomRate * nights;
    const taxAmount = Math.round(subtotal * 0.1 * 100) / 100; // 10% tax
    const discountAmount = Number(booking.discountAmount ?? 0);
    const totalAmount = subtotal + taxAmount - discountAmount;

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        status: 'PENDING' as any,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        dueDate: new Date(booking.checkOutDate),
        items: {
          create: {
            description: `${booking.room.category.name} — ${nights} night${nights !== 1 ? 's' : ''}`,
            quantity: nights,
            unitPrice: roomRate,
            totalPrice: subtotal,
          },
        },
      },
      include: INVOICE_INCLUDE,
    });
  }

  private async generateInvoiceNumber(): Promise<string> {
    const datePart = format(new Date(), 'yyyyMMdd');
    const prefix = `INV-${datePart}-`;
    const latest = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });
    const nextSeq = latest
      ? parseInt(latest.invoiceNumber.split('-').pop() ?? '0', 10) + 1
      : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
