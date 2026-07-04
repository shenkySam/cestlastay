import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { format } from 'date-fns';
import { CreateFolioDto } from './dto/create-folio.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

const INVOICE_INCLUDE = {
  booking: {
    include: {
      guest: true,
      rooms: { include: { room: { include: { category: true } } } },
    },
  },
  items: { orderBy: { createdAt: 'asc' as const } },
  payments: { orderBy: { createdAt: 'desc' as const } },
} as const;

// Room charge is excluded by default for OTA bookings — the guest already paid the OTA.
const OTA_SOURCES = ['BOOKING_COM', 'AIRBNB', 'EXPEDIA', 'AGODA', 'OTHER_OTA'];

const round2 = (n: number) => Math.round(n * 100) / 100;

const humanizeType = (type: string) =>
  type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // TAX_RATE env is a percentage (e.g. 10 = 10%)
  private taxRate(): number {
    const rate = Number(this.config.get('TAX_RATE'));
    return (Number.isFinite(rate) ? rate : 10) / 100;
  }

  async findByBookingId(bookingId: string, opts?: { hideDraft?: boolean }) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { bookingId },
      include: INVOICE_INCLUDE,
    });
    // Guests must not see the folio while staff are still drafting it.
    if (!invoice || (opts?.hideDraft && invoice.status === 'DRAFT')) {
      throw new NotFoundException(`No invoice for booking ${bookingId}`);
    }
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
        booking: { include: { guest: true, rooms: { include: { room: true } } } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Create a DRAFT folio for a booking (staff/admin)
  async createFolio(bookingId: string, dto: CreateFolioDto) {
    const existing = await this.prisma.invoice.findUnique({ where: { bookingId } });
    if (existing) {
      throw new ConflictException(`Invoice ${existing.invoiceNumber} already exists for this booking`);
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { rooms: { include: { room: { include: { category: true } } } } },
    });
    if (!booking) throw new NotFoundException(`Booking ${bookingId} not found`);

    const includeRoomCharge = dto.includeRoomCharge ?? !OTA_SOURCES.includes(booking.source);

    const nights = Math.ceil(
      (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    // One room-charge line per room on the booking
    const nightsLabel = `${nights} night${nights !== 1 ? 's' : ''}`;
    const roomItems = booking.rooms.map((br) => {
      const rate = Number(br.roomRate);
      return {
        description: `${br.room.category.name} (Room ${br.room.roomNumber}) — ${nightsLabel}`,
        quantity: nights,
        unitPrice: rate,
        totalPrice: round2(rate * nights),
      };
    });
    const roomTotal = round2(roomItems.reduce((sum, i) => sum + i.totalPrice, 0));

    const subtotal = includeRoomCharge ? roomTotal : 0;
    const taxAmount = round2(subtotal * this.taxRate());
    // Booking-level discount applies to the room price, so skip it when the room charge is excluded.
    const discountAmount = includeRoomCharge ? Number(booking.discountAmount ?? 0) : 0;
    const totalAmount = Math.max(0, round2(subtotal + taxAmount - discountAmount));

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.invoice.create({
      data: {
        invoiceNumber,
        bookingId,
        status: 'DRAFT' as any,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        balanceDue: totalAmount,
        dueDate: new Date(booking.checkOutDate),
        ...(includeRoomCharge && { items: { create: roomItems } }),
      },
      include: INVOICE_INCLUDE,
    });
  }

  // Add a line item: from a priced service request, or free-form
  async addItem(invoiceId: string, dto: AddInvoiceItemDto) {
    const invoice = await this.getEditableInvoice(invoiceId);

    let data: { serviceRequestId?: string; description: string; quantity: number; unitPrice: number };

    if (dto.serviceRequestId) {
      const sr = await this.prisma.serviceRequest.findUnique({
        where: { id: dto.serviceRequestId },
        include: { invoiceItems: { select: { id: true } } },
      });
      if (!sr) throw new NotFoundException(`Service request ${dto.serviceRequestId} not found`);
      if (sr.bookingId !== invoice.bookingId) {
        throw new BadRequestException('Service request belongs to a different booking');
      }
      if (sr.invoiceItems.length > 0) {
        throw new BadRequestException(`${sr.ticketNumber} is already on an invoice`);
      }
      const cost = sr.actualCost ?? sr.estimatedCost;
      if (cost == null) {
        throw new BadRequestException(`${sr.ticketNumber} has no cost set — price it first`);
      }
      data = {
        serviceRequestId: sr.id,
        description: `${humanizeType(sr.type)} — ${sr.description}`,
        quantity: 1,
        unitPrice: Number(cost),
      };
    } else {
      if (!dto.description || dto.unitPrice === undefined) {
        throw new BadRequestException('description and unitPrice are required for manual items');
      }
      data = {
        description: dto.description,
        quantity: dto.quantity ?? 1,
        unitPrice: dto.unitPrice,
      };
    }

    await this.prisma.invoiceItem.create({
      data: { invoiceId, ...data, totalPrice: round2(data.quantity * data.unitPrice) },
    });
    return this.recalc(invoiceId);
  }

  async updateItem(invoiceId: string, itemId: string, dto: UpdateInvoiceItemDto) {
    await this.getEditableInvoice(invoiceId);

    const item = await this.prisma.invoiceItem.findUnique({ where: { id: itemId } });
    if (!item || item.invoiceId !== invoiceId) {
      throw new NotFoundException(`Invoice item ${itemId} not found`);
    }

    const quantity = dto.quantity ?? item.quantity;
    const unitPrice = dto.unitPrice ?? Number(item.unitPrice);

    await this.prisma.invoiceItem.update({
      where: { id: itemId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        quantity,
        unitPrice,
        totalPrice: round2(quantity * unitPrice),
      },
    });
    return this.recalc(invoiceId);
  }

  async removeItem(invoiceId: string, itemId: string) {
    await this.getEditableInvoice(invoiceId);

    const item = await this.prisma.invoiceItem.findUnique({ where: { id: itemId } });
    if (!item || item.invoiceId !== invoiceId) {
      throw new NotFoundException(`Invoice item ${itemId} not found`);
    }

    await this.prisma.invoiceItem.delete({ where: { id: itemId } });
    return this.recalc(invoiceId);
  }

  async update(invoiceId: string, dto: UpdateInvoiceDto) {
    await this.getEditableInvoice(invoiceId);

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(dto.discountAmount !== undefined && { discountAmount: dto.discountAmount }),
        ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
      },
    });
    return this.recalc(invoiceId);
  }

  // DRAFT → PENDING: makes the invoice visible to the guest
  async issue(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only draft invoices can be issued');
    }
    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'PENDING' as any, issuedAt: new Date() },
      include: INVOICE_INCLUDE,
    });
  }

  // Completed, priced service requests for this booking not yet billed
  async getBillableServices(bookingId: string) {
    return this.prisma.serviceRequest.findMany({
      where: {
        bookingId,
        status: 'COMPLETED' as any,
        invoiceItems: { none: {} },
        OR: [{ actualCost: { not: null } }, { estimatedCost: { not: null } }],
      },
      orderBy: { completedAt: 'asc' },
    });
  }

  // Recompute money fields from line items, then derive status from payments
  private async recalc(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);

    const subtotal = round2(invoice.items.reduce((sum, i) => sum + Number(i.totalPrice), 0));
    const taxAmount = round2(subtotal * this.taxRate());
    const totalAmount = Math.max(0, round2(subtotal + taxAmount - Number(invoice.discountAmount)));
    const paidAmount = Number(invoice.paidAmount);
    const balanceDue = Math.max(0, round2(totalAmount - paidAmount));

    let status = invoice.status;
    if (paidAmount > 0 && balanceDue <= 0) status = 'PAID' as any;
    else if (paidAmount > 0) status = 'PARTIALLY_PAID' as any;
    // else: keep DRAFT / PENDING as-is

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal,
        taxAmount,
        totalAmount,
        balanceDue,
        status,
        // keep paidAt in sync when edits flip the status either way
        ...(status === 'PAID' && !invoice.paidAt && { paidAt: new Date() }),
        ...(status !== 'PAID' && invoice.paidAt && { paidAt: null }),
      },
      include: INVOICE_INCLUDE,
    });
  }

  private async getEditableInvoice(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled invoices cannot be edited');
    }
    return invoice;
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
