import type { HousekeepingStatus, ServiceStatus, ServiceType } from '@shared/index';

/** GET /analytics/overview?days=N */
export interface Overview {
  rangeDays: number;
  totalRooms: number;
  occupiedNow: number;
  availableNow: number;
  /** 0–100, one decimal */
  occupancyRate: number;
  periodRevenue: number;
  totalBookings: number;
  totalGuests: number;
  adr: number;
  revPAR: number;
  otaRevenue: number;
  otaCommission: number;
  otaBookings: number;
}

/** GET /analytics/revenue-by-day */
export interface RevenuePoint {
  date: string;
  label: string;
  revenue: number;
}

/** GET /analytics/occupancy-by-day */
export interface OccupancyPoint {
  date: string;
  label: string;
  rate: number;
  occupied: number;
  total: number;
}

/** GET /analytics/bookings-by-source */
export interface SourceRow {
  source: string;
  bookings: number;
  revenue: number;
  commission: number;
  netRevenue: number;
}

/** GET /analytics/top-rooms */
export interface TopRoom {
  roomId: string;
  roomNumber: string;
  categoryName: string;
  bookings: number;
  revenue: number;
}

interface PersonName {
  firstName: string;
  lastName: string;
}

/** GET /services */
export interface ServiceRequestRow {
  id: string;
  ticketNumber: string;
  type: ServiceType;
  status: ServiceStatus;
  priority: number;
  description: string;
  requestedAt: string;
  guest?: PersonName | null;
  booking?: { bookingNumber: string; rooms?: { room: { roomNumber: string } }[] } | null;
  assignedTo?: { user: PersonName } | null;
}

/** GET /housekeeping (TASK_INCLUDE in housekeeping.service.ts) */
export interface HousekeepingTaskRow {
  id: string;
  roomId: string;
  taskType: string;
  status: HousekeepingStatus;
  priority: number;
  scheduledFor: string;
  room: { id: string; roomNumber: string; floor: number };
  assignedTo?: { id: string; user: PersonName } | null;
}

/** GET /ratings/summary */
export interface RatingsSummary {
  totalRatings: number;
  avgOverall: number;
  avgRoom: number;
  avgService: number;
  distribution: Record<string, number>;
}
