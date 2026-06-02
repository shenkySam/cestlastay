import { Outlet, NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { label: 'My Booking',  href: '/guest/home',      icon: '🏠' },
  { label: 'Services',    href: '/guest/services',   icon: '🛎' },
  { label: 'Complaints',  href: '/guest/complaints', icon: '📝' },
  { label: 'My Bill',     href: '/guest/bill',       icon: '💳' },
];

export function GuestLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-sunset border-b border-accent-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="C'est La Stay" className="h-9 w-auto" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/90">
            Welcome, <span className="font-medium text-white">{user?.firstName}</span>
          </span>
          <button
            onClick={logout}
            className="text-sm text-white/80 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Bottom nav for mobile / top tab bar for desktop */}
      <nav className="bg-white border-b border-gray-200 px-4">
        <div className="max-w-2xl mx-auto flex gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
