import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

interface NotifyPayload {
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  link?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async findForUser(userId: string, status?: 'UNREAD' | 'READ') {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Marks one of the user's own notifications read; 404 for anyone else's. */
  async markRead(id: string, userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { status: 'READ', readAt: new Date() },
    });
    if (count === 0) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findUnique({ where: { id } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  // Send to a specific user
  async notifyUser(userId: string, payload: NotifyPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type as any,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata,
        link: payload.link,
        status: 'UNREAD',
      },
    });
    this.gateway.sendToUser(userId, notification);
    return notification;
  }

  // Broadcast to all staff + admins
  async notifyStaff(payload: NotifyPayload) {
    const staffUsers = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'STAFF'] as any }, status: 'ACTIVE' as any },
      select: { id: true },
    });

    await Promise.all(staffUsers.map((u) => this.notifyUser(u.id, payload)));
  }
}
