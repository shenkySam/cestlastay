import { IBooking } from '@shared/index';

// Compact room list for tables/cards: "#201" · "#201, #202" · "#201, #202 +1"
export function roomNumbersLabel(booking: Pick<IBooking, 'rooms'>, max = 2): string {
  const nums = (booking.rooms ?? [])
    .map((r) => r.room?.roomNumber)
    .filter((n): n is string => Boolean(n));
  if (nums.length === 0) return '—';
  const shown = nums.slice(0, max).map((n) => `#${n}`).join(', ');
  return nums.length > max ? `${shown} +${nums.length - max}` : shown;
}
