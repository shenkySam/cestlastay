import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { addDays, eachDayOfInterval, format, startOfDay, endOfDay, subDays } from 'date-fns';
import { BookingSource } from '@hms/shared';

const OTA_SOURCES: BookingSource[] = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(rangeDays = 30) {
    const now = new Date();
    const rangeStart = startOfDay(subDays(now, rangeDays - 1));
    const rangeEnd = endOfDay(now);

    const [totalRooms, bookings, payments, guestCount, occupiedNow] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.booking.findMany({
        where: {
          status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
          AND: [
            { checkInDate: { lte: rangeEnd } },
            { checkOutDate: { gte: rangeStart } },
          ],
        },
        select: {
          id: true,
          checkInDate: true,
          checkOutDate: true,
          totalAmount: true,
          source: true,
          status: true,
          otaCommission: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          status: 'COMPLETED' as any,
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
        select: { amount: true, createdAt: true },
      }),
      this.prisma.guest.count(),
      this.prisma.room.count({ where: { status: 'OCCUPIED' as any } }),
    ]);

    // Average occupancy across the date range
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    let occupiedRoomNights = 0;
    for (const day of days) {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const roomsOccupied = bookings.filter(
        (b) => new Date(b.checkInDate) <= dayEnd && new Date(b.checkOutDate) > dayStart,
      ).length;
      occupiedRoomNights += roomsOccupied;
    }
    const totalRoomNights = totalRooms * days.length;
    const occupancyRate = totalRoomNights > 0
      ? Math.round((occupiedRoomNights / totalRoomNights) * 1000) / 10
      : 0;

    const periodRevenue = payments.reduce((s, p) => s + Number(p.amount), 0);
    const totalBookingsValue = bookings.reduce((s, b) => s + Number(b.totalAmount), 0);
    const otaBookings = bookings.filter((b) => OTA_SOURCES.includes(b.source as BookingSource));
    const otaRevenue = otaBookings.reduce((s, b) => s + Number(b.totalAmount), 0);
    const otaCommission = otaBookings.reduce((s, b) => s + Number(b.otaCommission ?? 0), 0);

    const adr = occupiedRoomNights > 0
      ? Math.round((totalBookingsValue / occupiedRoomNights) * 100) / 100
      : 0;
    const revPAR = totalRooms > 0 && days.length > 0
      ? Math.round((totalBookingsValue / (totalRooms * days.length)) * 100) / 100
      : 0;

    return {
      rangeDays,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      totalRooms,
      occupiedNow,
      availableNow: totalRooms - occupiedNow,
      occupancyRate,
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      totalBookings: bookings.length,
      totalGuests: guestCount,
      adr,
      revPAR,
      otaRevenue: Math.round(otaRevenue * 100) / 100,
      otaCommission: Math.round(otaCommission * 100) / 100,
      otaBookings: otaBookings.length,
    };
  }

  async getRevenueByDay(rangeDays = 30) {
    const now = new Date();
    const rangeStart = startOfDay(subDays(now, rangeDays - 1));
    const rangeEnd = endOfDay(now);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'COMPLETED' as any,
        createdAt: { gte: rangeStart, lte: rangeEnd },
      },
      select: { amount: true, createdAt: true },
    });

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    const buckets: Record<string, number> = {};
    for (const d of days) {
      buckets[format(d, 'yyyy-MM-dd')] = 0;
    }
    for (const p of payments) {
      const key = format(new Date(p.createdAt), 'yyyy-MM-dd');
      if (key in buckets) buckets[key] += Number(p.amount);
    }

    return days.map((d) => {
      const key = format(d, 'yyyy-MM-dd');
      return {
        date: key,
        label: format(d, 'dd MMM'),
        revenue: Math.round(buckets[key] * 100) / 100,
      };
    });
  }

  async getOccupancyByDay(rangeDays = 30) {
    const now = new Date();
    const rangeStart = startOfDay(subDays(now, rangeDays - 1));
    const rangeEnd = endOfDay(now);

    const [totalRooms, bookings] = await Promise.all([
      this.prisma.room.count(),
      this.prisma.booking.findMany({
        where: {
          status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
          AND: [
            { checkInDate: { lte: rangeEnd } },
            { checkOutDate: { gte: rangeStart } },
          ],
        },
        select: { checkInDate: true, checkOutDate: true },
      }),
    ]);

    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const occupied = bookings.filter(
        (b) => new Date(b.checkInDate) <= dayEnd && new Date(b.checkOutDate) > dayStart,
      ).length;
      const rate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 1000) / 10 : 0;
      return {
        date: format(day, 'yyyy-MM-dd'),
        label: format(day, 'dd MMM'),
        occupied,
        total: totalRooms,
        rate,
      };
    });
  }

  async getBookingsBySource(rangeDays = 30) {
    const rangeStart = startOfDay(subDays(new Date(), rangeDays - 1));

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
        createdAt: { gte: rangeStart },
      },
      select: { source: true, totalAmount: true, otaCommission: true },
    });

    const map: Record<string, { source: string; bookings: number; revenue: number; commission: number }> = {};
    for (const b of bookings) {
      if (!map[b.source]) {
        map[b.source] = { source: b.source, bookings: 0, revenue: 0, commission: 0 };
      }
      map[b.source].bookings += 1;
      map[b.source].revenue += Number(b.totalAmount);
      map[b.source].commission += Number(b.otaCommission ?? 0);
    }

    return Object.values(map)
      .map((s) => ({
        ...s,
        revenue: Math.round(s.revenue * 100) / 100,
        commission: Math.round(s.commission * 100) / 100,
        netRevenue: Math.round((s.revenue - s.commission) * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  async getTopRooms(rangeDays = 30, limit = 5) {
    const rangeStart = startOfDay(subDays(new Date(), rangeDays - 1));

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: { notIn: ['CANCELLED', 'NO_SHOW'] as any },
        createdAt: { gte: rangeStart },
      },
      include: { room: { include: { category: true } } },
    });

    const map: Record<string, {
      roomId: string;
      roomNumber: string;
      categoryName: string;
      bookings: number;
      revenue: number;
    }> = {};
    for (const b of bookings) {
      if (!map[b.roomId]) {
        map[b.roomId] = {
          roomId: b.roomId,
          roomNumber: b.room.roomNumber,
          categoryName: b.room.category.name,
          bookings: 0,
          revenue: 0,
        };
      }
      map[b.roomId].bookings += 1;
      map[b.roomId].revenue += Number(b.totalAmount);
    }

    return Object.values(map)
      .map((r) => ({ ...r, revenue: Math.round(r.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}
