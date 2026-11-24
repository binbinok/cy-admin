export interface Member {
  _id: string;
  memberId: string;
  openId: string;
  nickName: string;
  phone: string;
  wechatId?: string;
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
  status: 'active' | 'frozen' | 'cancelled';
  levelHistory?: LevelHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LevelHistoryEntry {
  fromLevelId: string;
  fromLevelName: string;
  toLevelId: string;
  toLevelName: string;
  trigger: 'recharge' | 'manual';
  rechargeAmount?: number; // 分
  reason?: string;
  operatorAdminId: string;
  createdAt: Date | string;
}

export interface CardRechargeRecord {
  _id: string;
  cardId: string;
  memberId: string;
  amount: number; // 分
  balanceAfter: number | null; // 分
  operatorAdminId: string;
  note?: string;
  levelUpgrade?: { fromLevelId: string; toLevelId: string };
  createdAt: Date;
}

export interface CardConsumptionRecord {
  _id: string;
  cardId: string;
  memberId: string;
  amount: number; // 分
  balanceAfter: number | null; // 分
  item: string;
  note: string;
  consumptionId: string;
  createdAt: Date | string;
}

export interface PaymentDetail {
  paymentType:
    | 'member_card'
    | 'cash'
    | 'meituan'
    | 'wechat'
    | 'alipay'
    | 'douyin'
    | 'other';
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
  source?: 'appointment' | 'manual' | 'settlement' | 'import';
  note?: string;
  originalAmount?: number;
  discountAmount?: number;
  amount: number; // 分
  totalAmount?: number; // 分（技师业绩明细接口返回字段）
  points?: number;
  pointsEarned?: number;
  technicianName?: string;
  serviceTime?: Date | string;
  paymentDetails?: PaymentDetail[];
  sessionCoveredAmount?: number; // 分，次卡核销覆盖金额
  sessionRecognizedAmount?: number; // 分，次卡核销确认收入金额
  createdAt: Date;
}
