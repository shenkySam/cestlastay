import { Outlet } from 'react-router-dom';
import { Sidebar, NavItem } from './Sidebar';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';

const NAV: NavItem[] = [
  { label: 'Dashboard',        href: '/admin',           icon: '📊' },
  { label: 'Staff Management', href: '/admin/staff',     icon: '👥' },
  { label: 'Room Management',  href: '/admin/rooms',     icon: '🛏' },
  { label: 'Bookings',         href: '/admin/bookings',  icon: '📅' },
  { label: 'Guests',           href: '/admin/guests',    icon: '👤' },
  { label: 'Analytics',        href: '/admin/analytics', icon: '📈' },
  { label: 'CRM & Emails',     href: '/admin/crm',       icon: '📧' },
  { label: 'Payments',         href: '/admin/payments',  icon: '💳' },
];

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar items={NAV} title="Admin Panel" />
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
