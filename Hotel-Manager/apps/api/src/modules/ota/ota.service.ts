import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingSource } from '@hms/shared';
import { CreateOtaBookingDto } from './dto/create-ota-booking.dto';
import { RoomsService } from '../rooms/rooms.service';
import { format } from 'date-fns';

const BOOKING_INCLUDE = {
  guest: true,
  rooms: { include: { room: { include: { category: true } } } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

// Default commission rates if the staff member doesn't supply one
const DEFAULT_COMMISSION_RATE: Record<string, number> = {
  [BookingSource.BOOKING_COM]: 0.15,
  [BookingSource.AIRBNB]: 0.14,
  [BookingSource.EXPEDIA]: 0.18,
  [BookingSource.AGODA]: 0.17,
  [BookingSource.OTHER_OTA]: 0.15,
};

const OTA_SOURCES: BookingSource[] = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
];

@Injectable()
export class OtaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: RoomsService,
  ) {}

  async create(dto: CreateOtaBookingDto, createdById: string) {
    if (!OTA_SOURCES.includes(dto.source)) {
      throw new BadRequestException('source must be an OTA platform');
    }

    const roomIds = [...new Set(dto.roomIds)];
    const rooms = await this.prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: { category: true },
    });
    if (rooms.length !== roomIds.length) {
      const found = new Set(rooms.map((r) => r.id));
      const missing = roomIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Room ${missing.join(', ')} not found`);
    }

    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    await this.assertRoomsFree(roomIds, checkIn, checkOut);

    // Resolve guest — either by id or create-on-the-fly from booking data
    const guestId = await this.resolveGuest(dto);

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    // Per-room rate snapshots come from the category rack rate; the OTA-supplied
    // total takes precedence for the booking total (OTA pricing often differs).
    const bookingRooms = rooms.map((room) => ({
      roomId: room.id,
      roomRate: Number(room.category.basePrice),
    }));
    const rackTotal = bookingRooms.reduce((sum, r) => sum + r.roomRate * nights, 0);
    const total = dto.totalAmount !== undefined ? dto.totalAmount : rackTotal;

    // Commission — explicit value, otherwise apply default rate to total
    const commission = dto.otaCommission !== undefined
      ? dto.otaCommission
      : Math.round(total * (DEFAULT_COMMISSION_RATE[dto.source] ?? 0.15) * 100) / 100;

    const bookingNumber = await this.generateBookingNumber();

    const booking = await this.prisma.booking.create({
      data: {
        bookingNumber,
        guestId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: dto.numberOfGuests,
        status: 'CONFIRMED' as any,
        source: dto.source as any,
        totalAmount: total,
        otaBookingId: dto.otaBookingId,
        otaCommission: commission,
        specialRequests: dto.specialRequests,
        createdById,
        rooms: { create: bookingRooms },
      },
      include: BOOKING_INCLUDE,
    });

    await this.prisma.room.updateMany({
      where: { id: { in: roomIds }, status: 'AVAILABLE' as any },
      data: { status: 'RESERVED' as any },
    });

    return booking;
  }

  async findAll(filters?: { source?: BookingSource; from?: string; to?: string }) {
    return this.prisma.booking.findMany({
      where: {
        source: { in: (filters?.source ? [filters.source] : OTA_SOURCES) as any },
        ...(filters?.from && { checkInDate: { gte: new Date(filters.from) } }),
        ...(filters?.to && { checkOutDate: { lte: new Date(filters.to) } }),
      },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRevenueReport(filters?: { from?: string; to?: string }) {
    const where = {
      source: { in: OTA_SOURCES as any },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
      ...(filters?.from && { checkInDate: { gte: new Date(filters.from) } }),
      ...(filters?.to && { checkOutDate: { lte: new Date(filters.to) } }),
    };

    const bookings = await this.prisma.booking.findMany({
      where,
      select: {
        source: true,
        totalAmount: true,
        otaCommission: true,
      },
    });

    const bySource: Record<string, {
      source: string;
      bookings: number;
      grossRevenue: number;
      commission: number;
      netRevenue: number;
    }> = {};

    let totals = { bookings: 0, grossRevenue: 0, commission: 0, netRevenue: 0 };

    for (const b of bookings) {
      const gross = Number(b.totalAmount);
      const comm = Number(b.otaCommission ?? 0);
      const net = gross - comm;

      if (!bySource[b.source]) {
        bySource[b.source] = {
          source: b.source,
          bookings: 0,
          grossRevenue: 0,
          commission: 0,
          netRevenue: 0,
        };
      }
      bySource[b.source].bookings += 1;
      bySource[b.source].grossRevenue += gross;
      bySource[b.source].commission += comm;
      bySource[b.source].netRevenue += net;

      totals.bookings += 1;
      totals.grossRevenue += gross;
      totals.commission += comm;
      totals.netRevenue += net;
    }

    return {
      totals,
      bySource: Object.values(bySource).sort((a, b) => b.grossRevenue - a.grossRevenue),
    };
  }

  // ── Helpers ──────────────────────────────────────────────────

  private async resolveGuest(dto: CreateOtaBookingDto): Promise<string> {
    if (dto.guestId) {
      const existing = await this.prisma.guest.findUnique({ where: { id: dto.guestId } });
      if (!existing) throw new NotFoundException(`Guest ${dto.guestId} not found`);
      return existing.id;
    }

    if (!dto.guestFirstName || !dto.guestLastName || !dto.guestEmail || !dto.guestPhone) {
      throw new BadRequestException(
        'Guest is required — supply guestId or full name/email/phone for a new guest',
      );
    }

    const guest = await this.prisma.guest.create({
      data: {
        firstName: dto.guestFirstName,
        lastName: dto.guestLastName,
        email: dto.guestEmail,
        phone: dto.guestPhone,
      },
    });
    return guest.id;
  }

  private async assertRoomsFree(roomIds: string[], checkIn: Date, checkOut: Date) {
    const occupied = await this.rooms.getOccupiedRoomIds(checkIn, checkOut);
    const clashIds = roomIds.filter((id) => occupied.has(id));
    if (clashIds.length > 0) {
      const clashRooms = await this.prisma.room.findMany({
        where: { id: { in: clashIds } },
        select: { roomNumber: true },
      });
      const numbers = clashRooms.map((r) => `#${r.roomNumber}`).join(', ');
      throw new ConflictException(
        `Room${clashIds.length > 1 ? 's' : ''} ${numbers} already booked for the selected dates`,
      );
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
