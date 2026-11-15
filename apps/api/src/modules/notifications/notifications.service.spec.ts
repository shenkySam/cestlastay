import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsService.markRead', () => {
  const setup = (count: number) => {
    const prisma = {
      notification: {
        updateMany: jest.fn().mockResolvedValue({ count }),
        findUnique: jest.fn().mockResolvedValue({ id: 'n1', status: 'READ' }),
      },
    };
    const service = new NotificationsService(
      prisma as unknown as PrismaService,
      {} as NotificationsGateway,
    );
    return { service, prisma };
  };

  it('only updates a notification owned by the caller', async () => {
    const { service, prisma } = setup(1);
    await expect(service.markRead('n1', 'u1')).resolves.toMatchObject({ id: 'n1' });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'n1', userId: 'u1' } }),
    );
  });

  it("404s on someone else's notification", async () => {
    const { service } = setup(0);
    await expect(service.markRead('n1', 'intruder')).rejects.toThrow(NotFoundException);
  });
});
