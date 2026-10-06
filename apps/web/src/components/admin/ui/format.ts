import { differenceInCalendarDays, format } from 'date-fns';

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compactFmt = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const intFmt = new Intl.NumberFormat('en-US');

/** "$48,210" — pass `{ cents: true }` for "$48,210.40". */
export function money(n: number | string | null | undefined, opts: { cents?: boolean } = {}): string {
  const v = Number(n ?? 0);
  return (opts.cents ? usd2 : usd0).format(Number.isFinite(v) ? v : 0);
}

/** "12.4K", "1.2M" */
export function compact(n: number | null | undefined): string {
  return compactFmt.format(Number(n ?? 0));
}

/** "1,284" */
export function int(n: number | null | undefined): string {
  return intFmt.format(Math.round(Number(n ?? 0)));
}

/** pct(72.44) → "72.4%" */
export function pct(n: number | null | undefined, digits = 1): string {
  return `${Number(n ?? 0).toFixed(digits)}%`;
}

/** Signed percentage change from `prev` to `curr`; null when there's no baseline. */
export function deltaPct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function initials(first?: string | null, last?: string | null): string {
  return `${first?.trim()?.[0] ?? ''}${last?.trim()?.[0] ?? ''}`.toUpperCase() || '·';
}

/** Calendar key of a stored date-only value ("2026-10-05T00:00:00.000Z" → "2026-10-05"). */
export function dateKey(iso: string | null | undefined): string {
  return (iso ?? '').slice(0, 10);
}

/** Today's local calendar key, comparable with `dateKey()`. */
export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Nights between two stored dates. */
export function nights(checkIn: string, checkOut: string): number {
  return Math.max(0, differenceInCalendarDays(new Date(dateKey(checkOut)), new Date(dateKey(checkIn))));
}

/** "5–8 Oct" or "29 Sep – 2 Oct" for a stay. */
export function stayRange(checkIn: string, checkOut: string): string {
  const a = new Date(`${dateKey(checkIn)}T00:00:00`);
  const b = new Date(`${dateKey(checkOut)}T00:00:00`);
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return `${format(a, 'd')}–${format(b, 'd MMM')}`;
  }
  return `${format(a, 'd MMM')} – ${format(b, 'd MMM')}`;
}

/** "BOOKING_COM" → "Booking com"; prefer explicit label maps where they exist. */
export function humanize(value: string): string {
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const SOURCE_LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  WALK_IN: 'Walk-in',
  BOOKING_COM: 'Booking.com',
  AIRBNB: 'Airbnb',
  EXPEDIA: 'Expedia',
  AGODA: 'Agoda',
  OTHER_OTA: 'Other OTA',
};
