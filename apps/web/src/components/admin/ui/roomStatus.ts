import { RoomStatus } from '@shared/index';
import type { Tone } from './StatusDot';

/** Status light per room state. Occupied and reserved share lagoon; only occupied breathes. */
export const ROOM_STATUS_TONE: Record<RoomStatus, { tone: Tone; pulse: boolean }> = {
  [RoomStatus.AVAILABLE]: { tone: 'emerald', pulse: false },
  [RoomStatus.OCCUPIED]: { tone: 'lagoon', pulse: true },
  [RoomStatus.RESERVED]: { tone: 'lagoon', pulse: false },
  [RoomStatus.CLEANING]: { tone: 'amber', pulse: true },
  [RoomStatus.MAINTENANCE]: { tone: 'rose', pulse: true },
  [RoomStatus.OUT_OF_ORDER]: { tone: 'rose', pulse: true },
};
