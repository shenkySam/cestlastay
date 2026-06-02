import { Outlet } from 'react-router-dom';
import { Sidebar, NavItem } from './Sidebar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

const NAV: NavItem[] = [
  { label: 'Dashboard',    href: '/staff',             icon: '🏠' },
  { label: 'Room Dashboard', href: '/staff/rooms',     icon: '🛏' },
  { label: 'Bookings',     href: '/staff/bookings',    icon: '📅' },
  { label: 'Check In / Out', href: '/staff/checkin',   icon: '✅' },
  { label: 'Service Queue', href: '/staff/services',   icon: '🛎' },
  { label: 'Housekeeping', href: '/staff/housekeeping',icon: '🧹' },
  { label: 'Guests',       href: '/staff/guests',      icon: '👤' },
  { label: 'OTA Bookings', href: '/staff/ota',         icon: '✈️' },
];

export function StaffLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar items={NAV} title="Front Desk" />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <span />
          <NotificationDropdown />
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
