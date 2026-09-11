export type SessionCardValidityType = 'permanent' | 'days' | 'fixed_date';
export type SessionCardRefundPolicy = 'none' | 'prorated';
export type SessionCardStatus = 'active' | 'depleted' | 'expired' | 'refunded';

export interface SessionCardType {
  _id: string;
  name: string;
  price: number; // 分
  totalSessions: number;
  categoryId: string;
  categoryName: string;
  baseItemScope: 'all' | 'selected';
  baseItemIds: string[];
  coveredAddonIds: string[];
  validityType: SessionCardValidityType;
  validityDays: number;
  fixedExpireDate: string;
  refundPolicy: SessionCardRefundPolicy;
  active: boolean;
  soldCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SessionCardSnapshot {
  name: string;
  price: number; // 分
  totalSessions: number;
  sessionValue: number; // 分，floor(售价/总次数)
  categoryId: string;
  categoryName: string;
  baseItemScope: 'all' | 'selected';
  baseItemIds: string[];
  coveredAddonIds: string[];
  refundPolicy: SessionCardRefundPolicy;
}

export interface MemberSessionCard {
  _id: string;
  memberId: string;
  cardTypeId: string;
  cardTypeName: string;
  snapshot: SessionCardSnapshot;
  paidAmount: number; // 分
  paymentMethod: string;
  totalSessions: number;
  remainingSessions: number;
  expiresAt: string | null;
  status: SessionCardStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionCardRedemption {
  _id: string;
  cardId: string;
  memberId: string;
  consumptionId: string;
  categoryId: string;
  categoryName: string;
  baseItemId: string;
  baseItemName: string;
  coveredAmount: number; // 分
  recognizedAmount: number; // 分
  technicianId: string;
  technicianName: string;
  operatorAdminId: string;
  createdAt: string;
}

export interface PrepaidSummary {
  storedCardBalance: number; // 分
  sessionCardValue: number; // 分
  prepaidOutstanding: number; // 分
  periodNewPrepaid: number; // 分
  periodRechargeAmount: number; // 分
  periodSessionCardSales: number; // 分
}
