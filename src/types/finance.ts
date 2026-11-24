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
  commissionBase?: number; // 服务提成基数(分，原价中可计提部分)
  serviceCommission?: number; // 服务提成(分，基数×手工提成比例)
  cardSaleAmount?: number; // 会员卡开卡/续卡金额(分)
  cardCommission?: number; // 会员卡提成(分，按开卡/续卡比例)
  totalCommission?: number; // 总提成(分，服务提成+会员卡提成)
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
export interface UpdateConsumptionRecordPayload {
  recordId: string;
  serviceTime: string;
  note?: string;
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
  sessionCardId?: string; // 次卡核销，固定核销 1 次
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
  sessionCardRedemptionId?: string;
  sessionCoveredAmount?: number; // 分
  sessionRecognizedAmount?: number; // 分
}

export interface IncomePrefillData {
  appointmentId?: string;
  categoryId?: string;
  technicianId?: string;
  memberId?: string;
  guestName?: string;
  serviceTime?: string;
  note?: string;
}
