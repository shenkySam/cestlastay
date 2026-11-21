import { RoomStatus } from '@hms/shared';
import { unbookableStatuses } from './rooms.service';

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
