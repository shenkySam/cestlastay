import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HousekeepingStatus } from '@hms/shared';
import { CreateHousekeepingTaskDto } from './dto/create-housekeeping-task.dto';
import { UpdateHousekeepingTaskDto } from './dto/update-housekeeping-task.dto';
import { NotificationsService } from '../notifications/notifications.service';

const TASK_INCLUDE = {
  room: { select: { id: true, roomNumber: true, floor: true } },
  assignedTo: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
} as const;

@Injectable()
export class HousekeepingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(filters?: { status?: HousekeepingStatus; assignedToId?: string }) {
    return this.prisma.housekeepingTask.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
      },
      include: TASK_INCLUDE,
      orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }],
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.housekeepingTask.findUnique({ where: { id }, include: TASK_INCLUDE });
    if (!task) throw new NotFoundException(`Housekeeping task ${id} not found`);
    return task;
  }

  async create(dto: CreateHousekeepingTaskDto) {
    const task = await this.prisma.housekeepingTask.create({
      data: {
        roomId: dto.roomId,
        assignedToId: dto.assignedToId,
        taskType: dto.taskType,
        priority: dto.priority ?? 1,
        notes: dto.notes,
        scheduledFor: new Date(dto.scheduledFor),
        status: 'PENDING' as any,
      },
      include: TASK_INCLUDE,
    });

    await this.notifications.notifyStaff({
      type: 'HOUSEKEEPING_ALERT' as any,
      title: `Housekeeping: Room #${task.room.roomNumber}`,
      message: `${dto.taskType.replace('_', ' ')} scheduled`,
      metadata: { taskId: task.id, roomId: dto.roomId },
      link: '/staff/housekeeping',
    });

    return task;
  }

  async update(id: string, dto: UpdateHousekeepingTaskDto) {
    const task = await this.findOne(id);
    const data: any = {};

    if (dto.status) {
      data.status = dto.status;
      if (dto.status === HousekeepingStatus.IN_PROGRESS) data.startedAt = new Date();
      if (dto.status === HousekeepingStatus.COMPLETED) data.completedAt = new Date();
      if (dto.status === HousekeepingStatus.INSPECTED) {
        data.inspectedAt = new Date();
        // Mark room as AVAILABLE after inspection
        await this.prisma.room.update({
          where: { id: task.roomId },
          data: { status: 'AVAILABLE' as any, lastCleanedAt: new Date() },
        });
      }
    }
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;
    if (dto.notes !== undefined) data.notes = dto.notes;

    return this.prisma.housekeepingTask.update({ where: { id }, data, include: TASK_INCLUDE });
  }
}
