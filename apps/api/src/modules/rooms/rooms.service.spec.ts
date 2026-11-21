import { RoomStatus } from '@hms/shared';
import { RoomsService, unbookableStatuses } from './rooms.service';

describe('unbookableStatuses', () => {
  const now = new Date(2026, 10, 20, 15, 0);

  it('never offers out-of-order or maintenance rooms', () => {
    for (const checkIn of [new Date(2026, 10, 20), new Date(2026, 11, 5)]) {
      expect(unbookableStatuses(checkIn, now)).toEqual(
        expect.arrayContaining([RoomStatus.OUT_OF_ORDER, RoomStatus.MAINTENANCE]),
      );
    }
  });

  it('ignores a stale RESERVED/OCCUPIED status for future arrivals', () => {
    const blocked = unbookableStatuses(new Date(2026, 10, 21), now);
    expect(blocked).not.toContain(RoomStatus.OCCUPIED);
    expect(blocked).not.toContain(RoomStatus.RESERVED);
    expect(blocked).not.toContain(RoomStatus.CLEANING);
  });

  it('treats an occupied room as taken for a same-day arrival', () => {
    const blocked = unbookableStatuses(new Date(2026, 10, 20), now);
    expect(blocked).toContain(RoomStatus.OCCUPIED);
    expect(blocked).not.toContain(RoomStatus.RESERVED);
  });
});

describe('RoomsService.findNextAvailable', () => {
  const d = (iso: string) => new Date(iso + 'T00:00:00Z');
  const hold = (roomId: string, from: string, to: string) => ({
    roomId,
    booking: { checkInDate: d(from), checkOutDate: d(to) },
  });

  function service(rooms: { id: string; isVip: boolean }[], held: ReturnType<typeof hold>[]) {
    const prisma = {
      room: { findMany: jest.fn().mockResolvedValue(rooms) },
      bookingRoom: { findMany: jest.fn().mockResolvedValue(held) },
    };
    return { svc: new RoomsService(prisma as any, {} as any), prisma };
  }

  it('returns the first later window of the same length with a regular room free', async () => {
    const { svc } = service(
      [{ id: 'a', isVip: false }],
      [hold('a', '2026-12-01', '2026-12-05')],
    );
    // 1-3 Dec searched (2 nights): free again from the 5th
    await expect(svc.findNextAvailable(d('2026-12-01'), d('2026-12-03'))).resolves.toEqual({
      checkIn: '2026-12-05',
      checkOut: '2026-12-07',
      rooms: 1,
      vip: false,
    });
  });

  it('prefers a regular room over an earlier VIP-only window', async () => {
    const { svc } = service(
      [{ id: 'reg', isVip: false }, { id: 'vip', isVip: true }],
      [hold('reg', '2026-12-01', '2026-12-10')],
    );
    const next = await svc.findNextAvailable(d('2026-12-01'), d('2026-12-02'));
    expect(next).toMatchObject({ checkIn: '2026-12-10', vip: false });
  });

  it('falls back to a VIP-only window when no regular room opens up', async () => {
    const { svc } = service(
      [{ id: 'reg', isVip: false }, { id: 'vip', isVip: true }],
      [hold('reg', '2026-12-01', '2027-06-01')],
    );
    const next = await svc.findNextAvailable(d('2026-12-01'), d('2026-12-02'));
    expect(next).toMatchObject({ checkIn: '2026-12-02', vip: true });
  });

  it('returns null when nothing frees up within the horizon', async () => {
    const { svc } = service([{ id: 'a', isVip: false }], [hold('a', '2026-11-01', '2027-06-01')]);
    await expect(svc.findNextAvailable(d('2026-12-01'), d('2026-12-02'))).resolves.toBeNull();
  });

  it('filters rooms by guest count and rejects bad dates', async () => {
    const { svc, prisma } = service([], []);
    await expect(svc.findNextAvailable(d('2026-12-01'), d('2026-12-03'), 3)).resolves.toBeNull();
    expect(prisma.room.findMany.mock.calls[0][0].where.category).toEqual({ maxOccupancy: { gte: 3 } });
    await expect(svc.findNextAvailable(d('2026-12-03'), d('2026-12-01'))).rejects.toThrow();
  });
});
