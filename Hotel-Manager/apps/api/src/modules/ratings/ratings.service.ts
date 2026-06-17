import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(guestId: string, dto: CreateRatingDto) {
    // Verify booking belongs to this guest
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      select: { id: true, guestId: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.guestId !== guestId)
      throw new ForbiddenException('This booking does not belong to you');

    // Check for existing rating
    const existing = await this.prisma.rating.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existing)
      throw new BadRequestException('You have already rated this stay');

    return this.prisma.rating.create({
      data: {
        bookingId: dto.bookingId,
        guestId,
        overallRating: dto.overallRating,
        roomRating: dto.roomRating,
        comment: dto.comment,
      },
      include: {
        booking: { select: { bookingNumber: true } },
      },
    });
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.prisma.rating.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          guest: { select: { firstName: true, lastName: true, email: true } },
          booking: {
            select: {
              bookingNumber: true,
              checkInDate: true,
              checkOutDate: true,
              room: { select: { roomNumber: true } },
            },
          },
        },
      }),
      this.prisma.rating.count(),
    ]);

    return { ratings, total, page, limit };
  }

  async getSummary() {
    const [ratings, serviceRatings] = await Promise.all([
      this.prisma.rating.findMany({
        select: { overallRating: true, roomRating: true },
      }),
      this.prisma.serviceRequest.findMany({
        where: { serviceRating: { not: null } },
        select: { serviceRating: true },
      }),
    ]);

    const count = ratings.length;

    if (count === 0) {
      return {
        totalRatings: 0,
        avgOverall: 0,
        avgRoom: 0,
        avgService: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const avgOverall =
      ratings.reduce((s, r) => s + r.overallRating, 0) / count;
    const avgRoom = ratings.reduce((s, r) => s + r.roomRating, 0) / count;

    const serviceCount = serviceRatings.length;
    const avgService =
      serviceCount > 0
        ? serviceRatings.reduce((s, r) => s + (r.serviceRating ?? 0), 0) /
          serviceCount
        : 0;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
      number,
      number
    >;
    for (const r of ratings) {
      distribution[r.overallRating] = (distribution[r.overallRating] ?? 0) + 1;
    }

    return {
      totalRatings: count,
      avgOverall: Math.round(avgOverall * 10) / 10,
      avgRoom: Math.round(avgRoom * 10) / 10,
      avgService: Math.round(avgService * 10) / 10,
      distribution,
    };
  }

  async findByBooking(bookingId: string) {
    return this.prisma.rating.findUnique({
      where: { bookingId },
      include: {
        guest: { select: { firstName: true, lastName: true } },
        booking: { select: { bookingNumber: true } },
      },
    });
  }
}
