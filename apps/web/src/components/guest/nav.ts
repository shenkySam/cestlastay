import type { Icon } from '@phosphor-icons/react';
import { CallBellIcon, HouseLineIcon, ReceiptIcon } from '@phosphor-icons/react';

export interface GuestNavItem {
  label: string;
  href: string;
  icon: Icon;
}

export const GUEST_HOME = '/guest/home';

export const GUEST_NAV: GuestNavItem[] = [
  { label: 'My Booking', href: GUEST_HOME, icon: HouseLineIcon },
  { label: 'Services', href: '/guest/services', icon: CallBellIcon },
  { label: 'My Bill', href: '/guest/bill', icon: ReceiptIcon },
];

/** Before arrival there's nothing to request yet, so Services is hidden. */
export function guestNav(preArrival: boolean): GuestNavItem[] {
  return preArrival ? GUEST_NAV.filter((item) => item.href !== '/guest/services') : GUEST_NAV;
}
