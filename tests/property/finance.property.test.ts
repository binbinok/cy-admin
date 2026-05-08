import { describe, it } from 'vitest';
import * as fc from 'fast-check';

interface DailyRevenue {
  amount: number;
}

interface TechnicianStat {
  technicianId: string;
  orderCount: number;
  totalAmount: number;
}
interface IncomeFeeDetailInput {
  serviceFee: number;
  discountRate: number;
}
interface DiscountRatePairInput {
  serviceFee: number;
  lowDiscountRate: number;
  highDiscountRate: number;
}
interface IncomeFeeDetailOutput {
  amount: number;
  discountAmount: number;
  pointsEarned: number;
}

const sumRevenue = (items: DailyRevenue[]): number => {
  return items.reduce((acc: number, item: DailyRevenue) => acc + item.amount, 0);
};

const mergeTechnicianStats = (items: TechnicianStat[]): Record<string, TechnicianStat> => {
  return items.reduce<Record<string, TechnicianStat>>((acc: Record<string, TechnicianStat>, item: TechnicianStat) => {
    const current = acc[item.technicianId];
    if (!current) {
      acc[item.technicianId] = { ...item };
      return acc;
    }
    acc[item.technicianId] = {
      technicianId: item.technicianId,
      orderCount: current.orderCount + item.orderCount,
      totalAmount: current.totalAmount + item.totalAmount,
    };
    return acc;
  }, {});
};
const buildIncomeFeeDetail = (input: IncomeFeeDetailInput): IncomeFeeDetailOutput => {
  const amount = Math.floor((input.serviceFee * input.discountRate) / 100);
  return {
    amount,
    discountAmount: input.serviceFee - amount,
    pointsEarned: amount === 0 ? 0 : Math.floor(amount / 10),
  };
};
const normalizeDiscountRatePair = (input: DiscountRatePairInput): { low: number; high: number } => {
  if (input.lowDiscountRate <= input.highDiscountRate) {
    return { low: input.lowDiscountRate, high: input.highDiscountRate };
  }
  return { low: input.highDiscountRate, high: input.lowDiscountRate };
};

describe('cy-admin 财务统计属性测试', () => {
  it('Property 13: 财务汇总金额应等于每日收入之和', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ amount: fc.nat({ max: 10_000_000 }) }), { maxLength: 120 }),
        (items: DailyRevenue[]) => {
          const total = sumRevenue(items);
          const manual = items.map((item: DailyRevenue) => item.amount).reduce((a: number, b: number) => a + b, 0);
          return total === manual;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 14: 技师业绩聚合后订单数与金额不丢失', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            technicianId: fc.string({ minLength: 1, maxLength: 6 }),
            orderCount: fc.nat({ max: 100 }),
            totalAmount: fc.nat({ max: 1_000_000 }),
          }),
          { maxLength: 120 },
        ),
        (items: TechnicianStat[]) => {
          const merged = mergeTechnicianStats(items);
          const mergedSumOrderCount = Object.values(merged).reduce(
            (acc: number, item: TechnicianStat) => acc + item.orderCount,
            0,
          );
          const mergedSumAmount = Object.values(merged).reduce(
            (acc: number, item: TechnicianStat) => acc + item.totalAmount,
            0,
          );
          const originalSumOrderCount = items.reduce((acc: number, item: TechnicianStat) => acc + item.orderCount, 0);
          const originalSumAmount = items.reduce((acc: number, item: TechnicianStat) => acc + item.totalAmount, 0);
          return mergedSumOrderCount === originalSumOrderCount && mergedSumAmount === originalSumAmount;
        },
      ),
      { numRuns: 100 },
    );
  });
  it('Property 15: 收入录入费用明细保持金额守恒且积分与实付金额一致', () => {
    fc.assert(
      fc.property(
        fc.record({
          serviceFee: fc.integer({ min: 1, max: 1_000_000 }),
          discountRate: fc.integer({ min: 1, max: 100 }),
        }),
        (input: IncomeFeeDetailInput) => {
          const output = buildIncomeFeeDetail(input);
          const amountConserved = output.amount + output.discountAmount === input.serviceFee;
          const pointsMatched = output.pointsEarned === Math.floor(output.amount / 10);
          return amountConserved && pointsMatched;
        },
      ),
      { numRuns: 100 },
    );
  });
  it('Property 16: 更高折扣率（会员权益）不会降低实付金额与积分', () => {
    fc.assert(
      fc.property(
        fc.record({
          serviceFee: fc.integer({ min: 1, max: 1_000_000 }),
          lowDiscountRate: fc.integer({ min: 1, max: 100 }),
          highDiscountRate: fc.integer({ min: 1, max: 100 }),
        }),
        (input: DiscountRatePairInput) => {
          const rates = normalizeDiscountRatePair(input);
          const lowOutput = buildIncomeFeeDetail({
            serviceFee: input.serviceFee,
            discountRate: rates.low,
          });
          const highOutput = buildIncomeFeeDetail({
            serviceFee: input.serviceFee,
            discountRate: rates.high,
          });
          return (
            highOutput.amount >= lowOutput.amount &&
            highOutput.pointsEarned >= lowOutput.pointsEarned
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
