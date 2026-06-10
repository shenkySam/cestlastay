import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { StaffLayout } from '@/components/layouts/StaffLayout';
import { GuestLayout } from '@/components/layouts/GuestLayout';
import { UserRole } from '@shared/index';

// Auth & Guest portal
import LoginPage from '@/pages/auth/LoginPage';
import GuestPortalPage from '@/pages/guest/GuestPortalPage';

// Admin pages
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminRoomsPage from '@/pages/admin/RoomsPage';
import AdminBookingsPage from '@/pages/admin/BookingsPage';
import AdminGuestsPage from '@/pages/admin/GuestsPage';
import AdminStaffPage from '@/pages/admin/StaffPage';
import AdminPaymentsPage from '@/pages/admin/PaymentsPage';
import AdminCrmPage from '@/pages/admin/CrmPage';
import AdminAnalyticsPage from '@/pages/admin/AnalyticsPage';

// Staff pages
import StaffDashboardPage from '@/pages/staff/DashboardPage';
import StaffRoomDashboardPage from '@/pages/staff/RoomDashboardPage';
import StaffBookingsPage from '@/pages/staff/BookingsPage';
import StaffCheckInPage from '@/pages/staff/CheckInPage';
import StaffServiceQueuePage from '@/pages/staff/ServiceQueuePage';
import StaffHousekeepingPage from '@/pages/staff/HousekeepingPage';
import StaffGuestsPage from '@/pages/staff/GuestsPage';
import StaffOtaBookingsPage from '@/pages/staff/OtaBookingsPage';

// Guest pages
import GuestHomePage from '@/pages/guest/GuestHomePage';
import GuestServiceRequestPage from '@/pages/guest/ServiceRequestPage';
import GuestBillPage from '@/pages/guest/BillPage';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/guest-portal" element={<GuestPortalPage />} />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="staff"     element={<AdminStaffPage />} />
                <Route path="rooms"     element={<AdminRoomsPage />} />
                <Route path="bookings"  element={<AdminBookingsPage />} />
                <Route path="guests"    element={<AdminGuestsPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />
                <Route path="crm"       element={<AdminCrmPage />} />
                <Route path="payments"  element={<AdminPaymentsPage />} />
              </Route>

              {/* Staff routes */}
              <Route
                path="/staff"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.ADMIN]}>
                    <StaffLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StaffDashboardPage />} />
                <Route path="rooms"        element={<StaffRoomDashboardPage />} />
                <Route path="bookings"     element={<StaffBookingsPage />} />
                <Route path="checkin"      element={<StaffCheckInPage />} />
                <Route path="services"     element={<StaffServiceQueuePage />} />
                <Route path="housekeeping" element={<StaffHousekeepingPage />} />
                <Route path="guests"       element={<StaffGuestsPage />} />
                <Route path="ota"          element={<StaffOtaBookingsPage />} />
              </Route>

              {/* Guest routes */}
              <Route
                path="/guest"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.GUEST]}>
                    <GuestLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home"       element={<GuestHomePage />} />
                <Route path="services"   element={<GuestServiceRequestPage />} />
                <Route path="bill"       element={<GuestBillPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
