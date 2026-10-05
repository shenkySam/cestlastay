import { UserRole, UserStatus } from '../constants/roles';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IStaff {
  id: string;
  userId: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  user?: IUser;
}

export interface IGuest {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  idType?: string;
  idNumber?: string;
  loyaltyPoints: number;
  loyaltyTier?: string;
  createdAt: string;
  updatedAt: string;
}
