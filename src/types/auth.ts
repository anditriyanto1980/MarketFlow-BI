import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'OWNER' | 'ADMIN' | 'FINANCE' | 'MANAGER' | 'VIEWER';

export type MemberStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  onboardingCompleted: boolean;
  defaultBusinessId?: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface BusinessMember {
  userId: string;
  role: UserRole;
  status: MemberStatus;
  userEmail?: string;
  userDisplayName?: string;
  joinedAt: Timestamp | string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'VIEW_SALES'
  | 'VIEW_PROFIT'
  | 'MANAGE_PRODUCTS'
  | 'MANAGE_HPP'
  | 'MANAGE_STORES'
  | 'IMPORT_DATA'
  | 'RECONCILIATION'
  | 'MANAGE_TEAM'
  | 'BUSINESS_SETTINGS';
