import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, RoomStatus } from '@hms/shared';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { BookingsGateway } from './bookings.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CrmService } from '../crm/crm.service';
import { format } from 'date-fns';

const BOOKING_INCLUDE = {
  guest: true,
  room: { include: { category: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BookingsGateway,
    private readonly notifications: NotificationsService,
    private readonly crm: CrmService,
  ) {}

  async findAll(filters?: {
    status?: BookingStatus;
    guestId?: string;
    roomId?: string;
    search?: string;
  }) {
    return this.prisma.booking.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.guestId && { guestId: filters.guestId }),
        ...(filters?.roomId && { roomId: filters.roomId }),
        ...(filters?.search && {
          OR: [
            { bookingNumber: { contains: filters.search, mode: 'insensitive' } },
            { guest: { firstName: { contains: filters.search, mode: 'insensitive' } } },
            { guest: { lastName: { contains: filters.search, mode: 'insensitive' } } },
          ],
        }),
      },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async findByBookingNumber(bookingNumber: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: BOOKING_INCLUDE,
    });
    if (!booking) throw new NotFoundException(`Booking ${bookingNumber} not found`);
    return booking;
  }

  async create(dto: CreateBookingDto, createdById: string) {
    const room = await this.prisma.room.findUnique({ where: { id: dto.roomId } });
    if (!room) throw new NotFoundException(`Room ${dto.roomId} not found`);

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    await this.assertNoOverlap(dto.roomId, checkIn, checkOut);

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    const category = await this.prisma.roomCategory.findUnique({ where: { id: room.categoryId } });
    const rate = Number(category?.basePrice ?? 0);
    const total = rate * nights;

    const bookingNumber = await this.generateBookingNumber();

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber,
        guestId: dto.guestId,
        roomId: dto.roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: dto.numberOfGuests,
        status: 'CONFIRMED' as any,
        source: (dto.source ?? 'DIRECT') as any,
        roomRate: rate,
        totalAmount: total,
        specialRequests: dto.specialRequests,
        discountCode: dto.discountCode,
        createdById,
      },
      include: BOOKING_INCLUDE,
    });

    // Mark room as RESERVED
    await this.prisma.room.update({
      where: { id: dto.roomId },
      data: { status: 'RESERVED' as any },
    });

    // Fire-and-forget booking confirmation email
    this.crm.sendBookingConfirmation(booking.id).catch(() => undefined);

    return booking;
  }

  async update(id: string, dto: UpdateBookingDto) {
    const booking = await this.findOne(id);

    if (dto.checkInDate || dto.checkOutDate) {
      const newCheckIn = new Date(dto.checkInDate ?? booking.checkInDate);
      const newCheckOut = new Date(dto.checkOutDate ?? booking.checkOutDate);
      if (newCheckOut <= newCheckIn) {
        throw new BadRequestException('Check-out must be after check-in');
      }
      await this.assertNoOverlap(booking.roomId, newCheckIn, newCheckOut, id);
    }

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...(dto.checkInDate && { checkInDate: new Date(dto.checkInDate) }),
        ...(dto.checkOutDate && { checkOutDate: new Date(dto.checkOutDate) }),
        ...(dto.numberOfGuests !== undefined && { numberOfGuests: dto.numberOfGuests }),
        ...(dto.status && { status: dto.status as any }),
        ...(dto.specialRequests !== undefined && { specialRequests: dto.specialRequests }),
      },
      include: BOOKING_INCLUDE,
    });
  }

  async checkIn(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(`Cannot check in a booking with status ${booking.status}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CHECKED_IN' as any,
        actualCheckInAt: new Date(),
      },
      include: BOOKING_INCLUDE,
    });

    await this.prisma.room.update({
      where: { id: booking.roomId },
      data: { status: 'OCCUPIED' as any },
    });

    this.gateway.emitCheckedIn(updated);

    await this.notifications.notifyStaff({
      type: 'CHECK_IN',
      title: `Check-in: ${updated.guest.firstName} ${updated.guest.lastName}`,
      message: `Room #${updated.room.roomNumber} — ${booking.bookingNumber}`,
      metadata: { bookingId: id },
      link: '/staff/checkin',
    });

    return updated;
  }

  async checkOut(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(`Cannot check out a booking with status ${booking.status}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT' as any,
        actualCheckOutAt: new Date(),
      },
      include: BOOKING_INCLUDE,
    });

    await this.prisma.room.update({
      where: { id: booking.roomId },
      data: { status: 'CLEANING' as any },
    });

    // Auto-create housekeeping task
    await this.prisma.housekeepingTask.create({
      data: {
        roomId: booking.roomId,
        taskType: 'checkout_cleaning',
        status: 'PENDING' as any,
        priority: 2,
        scheduledFor: new Date(),
        notes: `Post-checkout cleaning for booking ${booking.bookingNumber}`,
      },
    });

    this.gateway.emitCheckedOut(updated);

    await this.notifications.notifyStaff({
      type: 'CHECK_OUT',
      title: `Check-out: ${updated.guest.firstName} ${updated.guest.lastName}`,
      message: `Room #${updated.room.roomNumber} — housekeeping task created`,
      metadata: { bookingId: id },
      link: '/staff/housekeeping',
    });

    return updated;
  }

  async cancel(id: string) {
    const booking = await this.findOne(id);

    if ([BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT].includes(booking.status as BookingStatus)) {
      throw new BadRequestException('Cannot cancel a booking that is already checked in or out');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' as any },
      include: BOOKING_INCLUDE,
    });

    // Free the room if it was reserved
    if (booking.room.status === RoomStatus.RESERVED) {
      await this.prisma.room.update({
        where: { id: booking.roomId },
        data: { status: 'AVAILABLE' as any },
      });
    }

    return updated;
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async assertNoOverlap(
    roomId: string,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string,
  ) {
    const overlap = await this.prisma.booking.findFirst({
      where: {
        roomId,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] as any },
        AND: [
          { checkInDate: { lt: checkOut } },
          { checkOutDate: { gt: checkIn } },
        ],
      },
    });
    if (overlap) {
      throw new ConflictException(`Room is already booked for the selected dates (${overlap.bookingNumber})`);
    }
  }

  private async generateBookingNumber(): Promise<string> {
    const datePart = format(new Date(), 'yyyyMMdd');
    const prefix = `BKG-${datePart}-`;
    const latest = await this.prisma.booking.findFirst({
      where: { bookingNumber: { startsWith: prefix } },
      orderBy: { bookingNumber: 'desc' },
    });
    const nextSeq = latest
      ? parseInt(latest.bookingNumber.split('-').pop() ?? '0', 10) + 1
      : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
