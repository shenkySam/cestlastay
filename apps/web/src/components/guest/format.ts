import { format, isToday, isYesterday } from 'date-fns';
import { dateKey } from '@/components/admin/ui/format';

export { humanize, money, nights } from '@/components/admin/ui/format';

/**
 * A stored date-only value ("2026-10-05T00:00:00.000Z") as local midnight, so
 * check-in and check-out show the booked day in every time zone.
 */
export function stayDate(iso: string): Date {
  return new Date(`${dateKey(iso)}T00:00:00`);
}

/** "Today, 14:32", "Yesterday, 09:10", "12 Oct, 14:32"; `midSentence` lowercases today/yesterday. */
export function stamp(iso: string, midSentence = false): string {
  const d = new Date(iso);
  const day = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'd MMM');
  return `${midSentence ? day.replace(/^(Today|Yesterday)$/, (w) => w.toLowerCase()) : day}, ${format(d, 'HH:mm')}`;
}
