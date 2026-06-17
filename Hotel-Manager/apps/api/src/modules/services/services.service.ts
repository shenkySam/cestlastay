import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceStatus, ServiceType } from '@hms/shared';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { format } from 'date-fns';

const SR_INCLUDE = {
  guest: { select: { id: true, firstName: true, lastName: true, email: true } },
  booking: { select: { id: true, bookingNumber: true, room: { select: { roomNumber: true } } } },
  assignedTo: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(filters?: { status?: ServiceStatus; type?: ServiceType; guestId?: string }) {
    return this.prisma.serviceRequest.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.type && { type: filters.type as any }),
        ...(filters?.guestId && { guestId: filters.guestId }),
      },
      include: SR_INCLUDE,
      orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const sr = await this.prisma.serviceRequest.findUnique({ where: { id }, include: SR_INCLUDE });
    if (!sr) throw new NotFoundException(`Service request ${id} not found`);
    return sr;
  }

  async create(dto: CreateServiceRequestDto) {
    const ticketNumber = await this.generateTicketNumber();

    const sr = await this.prisma.serviceRequest.create({
      data: {
        ticketNumber,
        guestId: dto.guestId,
        bookingId: dto.bookingId,
        type: dto.type as any,
        description: dto.description,
        priority: dto.priority ?? 1,
        status: 'PENDING' as any,
      },
      include: SR_INCLUDE,
    });

    // Notify all staff
    await this.notifications.notifyStaff({
      type: 'SERVICE_REQUEST' as any,
      title: `New ${dto.type.replace('_', ' ')} request`,
      message: `${sr.guest.firstName} ${sr.guest.lastName}: ${dto.description}`,
      metadata: { serviceRequestId: sr.id, ticketNumber: sr.ticketNumber },
      link: '/staff/services',
    });

    return sr;
  }

  async update(id: string, dto: UpdateServiceRequestDto) {
    await this.findOne(id);

    const data: any = {};
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === ServiceStatus.IN_PROGRESS) data.startedAt = new Date();
      if (dto.status === ServiceStatus.COMPLETED) data.completedAt = new Date();
    }
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.estimatedCost !== undefined) data.estimatedCost = dto.estimatedCost;
    if (dto.actualCost !== undefined) data.actualCost = dto.actualCost;

    return this.prisma.serviceRequest.update({ where: { id }, data, include: SR_INCLUDE });
  }

  private async generateTicketNumber(): Promise<string> {
    const datePart = format(new Date(), 'yyyyMMdd');
    const prefix = `SRV-${datePart}-`;
    const latest = await this.prisma.serviceRequest.findFirst({
      where: { ticketNumber: { startsWith: prefix } },
      orderBy: { ticketNumber: 'desc' },
    });
    const nextSeq = latest
      ? parseInt(latest.ticketNumber.split('-').pop() ?? '0', 10) + 1
      : 1;
    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }
}
