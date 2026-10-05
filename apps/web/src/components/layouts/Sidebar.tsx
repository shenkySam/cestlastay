import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '@/contexts/AuthContext';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface Props {
  items: NavItem[];
  title: string;
}

export function Sidebar({ items, title }: Props) {
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-primary-950 flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-accent-700 bg-sunset">
        <div className="flex flex-col items-center gap-2 text-center">
          <img src="/logo.png" alt="C'est La Stay" className="w-24 h-auto" />
          <p className="text-white/90 text-xs">{title}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((item, index) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={index === 0}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-100 hover:bg-primary-800 hover:text-white',
              )
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-primary-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-primary-200 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-primary-200 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-primary-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
