import {
  AirplaneTiltIcon,
  BellRingingIcon,
  BroomIcon,
  CalendarDotsIcon,
  DoorOpenIcon,
  GridFourIcon,
  SquaresFourIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { navPageTitle, type AdminNavGroup } from '@/components/admin/shell/nav';

export const STAFF_HOME = '/staff';

export const STAFF_NAV: AdminNavGroup[] = [
  {
    label: 'Today',
    items: [
      { label: 'Dashboard', href: '/staff', icon: SquaresFourIcon },
      { label: 'Room board', href: '/staff/rooms', icon: GridFourIcon },
    ],
  },
  {
    label: 'Front desk',
    items: [
      { label: 'Bookings', href: '/staff/bookings', icon: CalendarDotsIcon },
      { label: 'Check in / out', href: '/staff/checkin', icon: DoorOpenIcon },
      { label: 'Guests', href: '/staff/guests', icon: UsersThreeIcon },
      { label: 'OTA bookings', href: '/staff/ota', icon: AirplaneTiltIcon },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Service queue', href: '/staff/services', icon: BellRingingIcon },
      { label: 'Housekeeping', href: '/staff/housekeeping', icon: BroomIcon },
    ],
  },
];

export function staffPageTitle(pathname: string): string {
  return navPageTitle(STAFF_NAV, STAFF_HOME, pathname);
}
