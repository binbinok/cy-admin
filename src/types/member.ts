export interface Member {
  _id: string;
  memberId: string;
  openId: string;
  nickName: string;
  phone: string;
  level: 'normal' | 'silver' | 'gold' | 'diamond';
  points: number;
  totalConsumption: number; // 分
  birthday?: string; // YYYY-MM-DD
  source?: string;
  consumptionCount: number;
  lastConsumptionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberCard {
  _id: string;
  cardId: string;
  memberId: string;
  discountLevelId: string;
  balance: number; // 分
  totalRecharge: number; // 分
  status: 'active' | 'frozen';
  createdAt: Date;
  updatedAt: Date;
}

export interface CardRechargeRecord {
  _id: string;
  cardId: string;
  memberId: string;
  amount: number; // 分
  balanceAfter: number; // 分
  operatorAdminId: string;
  createdAt: Date;
}

export interface PaymentDetail {
  paymentType: 'member_card' | 'cash' | 'meituan';
  amount: number; // 分
  createdAt?: Date;
}

export interface ConsumptionRecord {
  _id: string;
  memberId?: string;
  appointmentId?: string;
  serviceName?: string;
  serviceCategory?: string;
  technicianId?: string;
  source?: 'appointment' | 'manual';
  note?: string;
  originalAmount?: number;
  discountAmount?: number;
  amount: number; // 分
  points?: number;
  pointsEarned?: number;
  technicianName?: string;
  serviceTime?: Date | string;
  paymentDetails?: PaymentDetail[];
  createdAt: Date;
}
