import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.guest.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const guest = await this.prisma.guest.findUnique({ where: { id } });
    if (!guest) throw new NotFoundException(`Guest ${id} not found`);
    return guest;
  }

  async findBookings(id: string) {
    await this.findOne(id);
    return this.prisma.booking.findMany({
      where: { guestId: id },
      include: { rooms: { include: { room: { include: { category: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateGuestDto) {
    return this.prisma.guest.create({ data: dto });
  }

  async findOrCreate(dto: CreateGuestDto) {
    const existing = await this.prisma.guest.findFirst({
      where: { email: dto.email },
    });
    if (existing) return existing;
    return this.create(dto);
  }

  async update(id: string, dto: UpdateGuestDto) {
    await this.findOne(id);
    return this.prisma.guest.update({ where: { id }, data: dto });
  }
}
