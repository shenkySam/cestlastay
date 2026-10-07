import {
  BedIcon,
  CalendarDotsIcon,
  ChartLineUpIcon,
  CreditCardIcon,
  EnvelopeSimpleIcon,
  IdentificationBadgeIcon,
  SquaresFourIcon,
  StarIcon,
  TagIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: Icon;
  /** Extra words the command palette matches on */
  keywords: string;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_HOME = '/admin';

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: SquaresFourIcon, keywords: 'home overview today summary' },
      { label: 'Analytics', href: '/admin/analytics', icon: ChartLineUpIcon, keywords: 'reports revenue occupancy charts adr revpar' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Bookings', href: '/admin/bookings', icon: CalendarDotsIcon, keywords: 'reservations new booking folio invoice' },
      { label: 'Rooms', href: '/admin/rooms', icon: BedIcon, keywords: 'add a room inventory floors status' },
      { label: 'Stays & Pricing', href: '/admin/stays', icon: TagIcon, keywords: 'rates packages offers prices' },
      { label: 'Guests', href: '/admin/guests', icon: UsersThreeIcon, keywords: 'customers profiles loyalty points' },
    ],
  },
  {
    label: 'Revenue',
    items: [
      { label: 'Payments', href: '/admin/payments', icon: CreditCardIcon, keywords: 'record a payment invoices refunds transactions' },
      { label: 'CRM & Emails', href: '/admin/crm', icon: EnvelopeSimpleIcon, keywords: 'campaigns emails discounts codes marketing' },
      { label: 'Ratings', href: '/admin/ratings', icon: StarIcon, keywords: 'review guest ratings feedback scores' },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'Staff', href: '/admin/staff', icon: IdentificationBadgeIcon, keywords: 'team employees users roles departments' },
    ],
  },
];

const ALL_ITEMS = ADMIN_NAV.flatMap((group) => group.items);

/** Page name for the top bar: the longest nav href that prefixes the path. */
export function adminPageTitle(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || ADMIN_HOME;
  let best: AdminNavItem | undefined;
  for (const item of ALL_ITEMS) {
    const hit = path === item.href || path.startsWith(`${item.href}/`);
    if (hit && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.label ?? 'Dashboard';
}
