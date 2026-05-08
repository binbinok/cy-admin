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
}
export interface CreateIncomeRecordPayload {
  serviceCategory: string;
  serviceName: string;
  serviceFee: number;
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
