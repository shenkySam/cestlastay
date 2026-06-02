import { RoomStatus, RoomType } from '../constants/statuses';

export interface IRoomCategory {
  id: string;
  name: string;
  type: RoomType;
  description?: string;
  basePrice: number;
  maxOccupancy: number;
  amenities: string[];
  images: string[];
}

export interface IRoom {
  id: string;
  roomNumber: string;
  categoryId: string;
  category?: IRoomCategory;
  floor: number;
  status: RoomStatus;
  lastCleanedAt?: string;
  maintenanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}
