import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const ACTIONS = [
  { label: 'Request Service',  icon: '🛎', href: '/guest/services' },
  { label: 'File a Complaint', icon: '📝', href: '/guest/complaints' },
  { label: 'View My Bill',     icon: '💳', href: '/guest/bill' },
  { label: 'Express Check-out', icon: '🚪', href: '/guest/bill' },
];

export default function GuestHomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome, {user?.firstName}!
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          How can we make your stay more comfortable?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.href}
            className="card p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow"
          >
            <span className="text-3xl">{action.icon}</span>
            <span className="text-sm font-medium text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
