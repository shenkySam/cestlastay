import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoomStatus } from '@hms/shared';
import { startOfDay } from 'date-fns';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { CreateRoomCategoryDto } from './dto/create-room-category.dto';
import { UpdateRoomCategoryDto } from './dto/update-room-category.dto';
import { RoomsGateway } from './rooms.gateway';

const ROOM_INCLUDE = {
  category: true,
} as const;

/**
 * Room statuses that rule a room out for a stay starting on `checkIn`.
 *
 * A room's status is its state right now, so it only says something about a
 * stay that starts today: then an OCCUPIED room isn't free yet (CLEANING and
 * RESERVED will be ready by arrival). Future dates are decided by overlapping
 * bookings alone, so a stale RESERVED/OCCUPIED status can't block them.
 * OUT_OF_ORDER and MAINTENANCE rooms are never offered.
 */
export function unbookableStatuses(checkIn: Date, now = new Date()): RoomStatus[] {
  const blocked = [RoomStatus.OUT_OF_ORDER, RoomStatus.MAINTENANCE];
  return startOfDay(checkIn) <= startOfDay(now) ? [...blocked, RoomStatus.OCCUPIED] : blocked;
}

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RoomsGateway,
  ) {}

  // ── Categories ──────────────────────────────────────────────

  async findAllCategories() {
    return this.prisma.roomCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(dto: CreateRoomCategoryDto) {
    const exists = await this.prisma.roomCategory.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Category "${dto.name}" already exists`);
    return this.prisma.roomCategory.create({
      data: {
        name: dto.name,
        type: dto.type as any,
        description: dto.description,
        basePrice: dto.basePrice,
        maxOccupancy: dto.maxOccupancy,
        amenities: dto.amenities ?? [],
        images: dto.images ?? [],
      },
    });
  }

  async updateCategory(id: string, dto: UpdateRoomCategoryDto) {
    await this.findCategoryOrThrow(id);
    return this.prisma.roomCategory.update({ where: { id }, data: dto as any });
  }

  async deleteCategory(id: string) {
    await this.findCategoryOrThrow(id);
    const roomCount = await this.prisma.room.count({ where: { categoryId: id } });
    if (roomCount > 0) throw new ConflictException('Cannot delete category with existing rooms');
    await this.prisma.roomCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  private async findCategoryOrThrow(id: string) {
    const cat = await this.prisma.roomCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException(`Room category ${id} not found`);
    return cat;
  }

  // ── Rooms ────────────────────────────────────────────────────

  async findAll(filters?: { status?: RoomStatus; floor?: number; categoryId?: string }) {
    return this.prisma.room.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.floor !== undefined && { floor: filters.floor }),
        ...(filters?.categoryId && { categoryId: filters.categoryId }),
      },
      include: ROOM_INCLUDE,
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id }, include: ROOM_INCLUDE });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  async create(dto: CreateRoomDto) {
    const exists = await this.prisma.room.findUnique({ where: { roomNumber: dto.roomNumber } });
    if (exists) throw new ConflictException(`Room number ${dto.roomNumber} already exists`);
    await this.findCategoryOrThrow(dto.categoryId);
    return this.prisma.room.create({ data: dto as any, include: ROOM_INCLUDE });
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.findOneOrThrow(id);
    if (dto.categoryId) await this.findCategoryOrThrow(dto.categoryId);
    return this.prisma.room.update({ where: { id }, data: dto as any, include: ROOM_INCLUDE });
  }

  async updateStatus(id: string, dto: UpdateRoomStatusDto) {
    await this.findOneOrThrow(id);
    const updated = await this.prisma.room.update({
      where: { id },
      data: {
        status: dto.status as any,
        ...(dto.maintenanceNotes !== undefined && { maintenanceNotes: dto.maintenanceNotes }),
        ...(dto.status === RoomStatus.AVAILABLE && { lastCleanedAt: new Date() }),
      },
      include: ROOM_INCLUDE,
    });
    this.gateway.emitRoomStatusChanged(updated);
    return updated;
  }

  async delete(id: string) {
    await this.findOneOrThrow(id);
    await this.prisma.room.delete({ where: { id } });
    return { message: 'Room deleted' };
  }

  async checkAvailability(checkIn: Date, checkOut: Date, categoryId?: string, guests?: number) {
    const occupiedRoomIds = await this.getOccupiedRoomIds(checkIn, checkOut);

    return this.prisma.room.findMany({
      where: {
        status: { notIn: unbookableStatuses(checkIn) as any },
        id: { notIn: [...occupiedRoomIds] },
        ...(categoryId && { categoryId }),
        ...(guests && { category: { maxOccupancy: { gte: guests } } }),
      },
      include: ROOM_INCLUDE,
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
    });
  }

  /**
   * The nearest stay of the same length, starting after `checkIn`, with a room
   * free for `guests`. Prefers regular rooms; falls back to a VIP-only window.
   * Returns null when nothing opens up within `horizonDays`.
   */
  async findNextAvailable(checkIn: Date, checkOut: Date, guests?: number, horizonDays = 60) {
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
      throw new BadRequestException('Choose a check-out date after check-in');
    }
    const DAY = 24 * 60 * 60 * 1000;
    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / DAY);

    const rooms = await this.prisma.room.findMany({
      where: {
        status: { notIn: [RoomStatus.OUT_OF_ORDER, RoomStatus.MAINTENANCE] as any },
        ...(guests && { category: { maxOccupancy: { gte: guests } } }),
      },
      select: { id: true, isVip: true },
    });
    if (rooms.length === 0) return null;

    const windowEnd = new Date(checkIn.getTime() + (horizonDays + nights) * DAY);
    const held = await this.prisma.bookingRoom.findMany({
      where: {
        roomId: { in: rooms.map((r) => r.id) },
        booking: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] as any },
          checkInDate: { lt: windowEnd },
          checkOutDate: { gt: checkIn },
        },
      },
      select: { roomId: true, booking: { select: { checkInDate: true, checkOutDate: true } } },
    });

    let vipOnly: { checkIn: string; checkOut: string; rooms: number; vip: boolean } | null = null;
    for (let d = 1; d <= horizonDays; d++) {
      const start = new Date(checkIn.getTime() + d * DAY);
      const end = new Date(start.getTime() + nights * DAY);
      const free = rooms.filter(
        (r) =>
          !held.some(
            (h) => h.roomId === r.id && h.booking.checkInDate < end && h.booking.checkOutDate > start,
          ),
      );
      const regular = free.filter((r) => !r.isVip).length;
      const window = { checkIn: start.toISOString().slice(0, 10), checkOut: end.toISOString().slice(0, 10) };
      if (regular > 0) return { ...window, rooms: regular, vip: false };
      if (!vipOnly && free.length > 0) vipOnly = { ...window, rooms: free.length, vip: true };
    }
    return vipOnly;
  }

  // Room ids held by CONFIRMED/CHECKED_IN bookings overlapping [checkIn, checkOut)
  async getOccupiedRoomIds(
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: string,
  ): Promise<Set<string>> {
    const rows = await this.prisma.bookingRoom.findMany({
      where: {
        booking: {
          ...(excludeBookingId && { id: { not: excludeBookingId } }),
          status: { in: ['CONFIRMED', 'CHECKED_IN'] as any },
          AND: [
            { checkInDate: { lt: checkOut } },
            { checkOutDate: { gt: checkIn } },
          ],
        },
      },
      select: { roomId: true },
    });
    return new Set(rows.map((r) => r.roomId));
  }

  private async findOneOrThrow(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }
}
