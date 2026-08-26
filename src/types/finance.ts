export interface FinanceSummary {
  totalRevenue: number; // 分
  orderCount: number;
}

export interface RevenueTrend {
  date: string;
  amount: number; // 分
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  orderCount: number;
  totalAmount: number; // 分
  commissionRate?: number; // 提成比例(%)
  commissionAmount?: number; // 应得提成金额(分)
}
export interface CreateIncomeRecordPayload {
  serviceCategory: string;
  serviceName: string;
  serviceFee?: number;
  paymentDetails?: Array<{ paymentType: string; amount: number }>;
  serviceTime: string;
  technicianId: string;
  memberId?: string;
  note?: string;
}
export interface CreateIncomeRecordResult {
  consumptionId: string;
  amount: number;
  originalAmount: number;
  discountAmount: number;
  pointsEarned: number;
}
export interface SettlementAddon {
  itemId: string;
  inputValue?: string;
  price: number; // 分
}
export interface SettlementCustomAddon {
  name: string;
  price: number; // 分
  reason: string;
}
export interface CreateSettlementPayload {
  appointmentId?: string;
  memberId?: string;
  guestName?: string;
  technicianId: string;
  serviceTime: string;
  categoryId: string;
  baseItemId: string;
  baseItemPrice: number; // 分
  addons?: SettlementAddon[];
  customAddons?: SettlementCustomAddon[];
  adjustAmount?: number; // 分，可正可负
  adjustReason?: string;
  paymentDetails: Array<{ paymentType: string; amount: number }>;
  note?: string;
}
export interface SettlementResult {
  consumptionId: string;
  originalAmount: number;
  discountAmount: number;
  receivableAmount: number;
  adjustAmount: number;
  amount: number;
  pointsEarned: number;
  commissionAmount: number;
}
