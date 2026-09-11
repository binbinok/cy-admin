import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { computeSettlementAmounts } from '@/utils/settlement';
import { computeSessionValue, isSessionCardUsableForItem } from '@/utils/sessionCard';
import type { MemberSessionCard } from '@/types/sessionCard';

const priceArb = fc.integer({ min: 0, max: 1000000 });

const buildCard = (overrides: Partial<MemberSessionCard>): MemberSessionCard => ({
  _id: 'card1',
  memberId: 'M001',
  cardTypeId: 'ct1',
  cardTypeName: '美甲 10 次卡',
  snapshot: {
    name: '美甲 10 次卡',
    price: 68000,
    totalSessions: 10,
    sessionValue: 6800,
    categoryId: 'cat1',
    categoryName: '美甲',
    baseItemScope: 'all',
    baseItemIds: [],
    coveredAddonIds: [],
    refundPolicy: 'prorated',
  },
  paidAmount: 68000,
  paymentMethod: 'cash',
  totalSessions: 10,
  remainingSessions: 10,
  expiresAt: null,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('次卡折算价不变量', () => {
  it('sessionValue = floor(售价 / 总次数)，且余数小于总次数', () => {
    fc.assert(
      fc.property(priceArb, fc.integer({ min: 1, max: 100 }), (price, totalSessions) => {
        const value = computeSessionValue(price, totalSessions);
        return (
          value === Math.floor(price / totalSessions) &&
          value * totalSessions <= price &&
          price - value * totalSessions < totalSessions
        );
      }),
    );
  });

  it('总次数为 0 或负数时折算价恒为 0', () => {
    fc.assert(
      fc.property(priceArb, fc.integer({ min: -100, max: 0 }), (price, totalSessions) => {
        return computeSessionValue(price, totalSessions) === 0;
      }),
    );
  });
});

describe('次卡核销匹配不变量', () => {
  it('适用全部基础项目时同大类任意项目可核销，跨大类不可核销', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (baseItemId) => {
        const card = buildCard({});
        const sameCategory = isSessionCardUsableForItem({ card, categoryId: 'cat1', baseItemId });
        const otherCategory = isSessionCardUsableForItem({ card, categoryId: 'cat2', baseItemId });
        return sameCategory === true && otherCategory === false;
      }),
    );
  });

  it('指定基础项目时仅名单内项目可核销', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1 }),
        (baseItemIds, targetId) => {
          const card = buildCard({});
          card.snapshot = { ...card.snapshot, baseItemScope: 'selected', baseItemIds };
          const usable = isSessionCardUsableForItem({ card, categoryId: 'cat1', baseItemId: targetId });
          return usable === baseItemIds.includes(targetId);
        },
      ),
    );
  });

  it('次数用尽、已过期或非 active 状态的卡不可核销', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('active', 'depleted', 'expired', 'refunded'),
        fc.integer({ min: 0, max: 10 }),
        fc.boolean(),
        (status, remainingSessions, expired) => {
          const card = buildCard({
            status: status as MemberSessionCard['status'],
            remainingSessions,
            expiresAt: expired ? '2020-01-01T00:00:00.000Z' : null,
          });
          const usable = isSessionCardUsableForItem({ card, categoryId: 'cat1', baseItemId: 'item1' });
          const expected = status === 'active' && remainingSessions > 0 && !expired;
          return usable === expected;
        },
      ),
    );
  });
});

describe('次卡覆盖项结算不变量', () => {
  it('覆盖项不计入应收，应收 = 原价 - 次卡抵扣 - 折扣', () => {
    fc.assert(
      fc.property(priceArb, fc.array(priceArb, { maxLength: 5 }), (basePrice, addonPrices) => {
        const result = computeSettlementAmounts({
          baseItem: { price: basePrice, discountable: true, commissionable: true, paidBySessionCard: true },
          addons: addonPrices.map((price, index) => ({
            price,
            discountable: true,
            commissionable: true,
            paidBySessionCard: index % 2 === 0,
          })),
          customAddons: [],
          discountRate: 80,
          adjustAmount: 0,
        });
        const covered =
          basePrice + addonPrices.filter((_, index) => index % 2 === 0).reduce((s, p) => s + p, 0);
        const uncovered = addonPrices.filter((_, index) => index % 2 !== 0).reduce((s, p) => s + p, 0);
        const expectedDiscount = uncovered - Math.floor((uncovered * 80) / 100);
        return (
          result.sessionCoveredAmount === covered &&
          result.receivableAmount === result.originalAmount - covered - result.discountAmount &&
          result.discountAmount === expectedDiscount
        );
      }),
    );
  });

  it('覆盖项不参与折扣与常项提成', () => {
    fc.assert(
      fc.property(priceArb, priceArb, (coveredPrice, normalPrice) => {
        const result = computeSettlementAmounts({
          baseItem: { price: coveredPrice, discountable: true, commissionable: true, paidBySessionCard: true },
          addons: [{ price: normalPrice, discountable: true, commissionable: true }],
          customAddons: [],
          discountRate: 80,
          adjustAmount: 0,
        });
        const expectedDiscount = normalPrice - Math.floor((normalPrice * 80) / 100);
        return (
          result.discountAmount === expectedDiscount &&
          result.commissionableAmount === normalPrice &&
          result.sessionCoveredAmount === coveredPrice
        );
      }),
    );
  });

  it('全部项目被次卡覆盖且不改价时实收恒为 0', () => {
    fc.assert(
      fc.property(priceArb, fc.array(priceArb, { maxLength: 5 }), (basePrice, addonPrices) => {
        const result = computeSettlementAmounts({
          baseItem: { price: basePrice, discountable: true, commissionable: true, paidBySessionCard: true },
          addons: addonPrices.map((price) => ({
            price,
            discountable: true,
            commissionable: true,
            paidBySessionCard: true,
          })),
          customAddons: [],
          discountRate: 80,
          adjustAmount: 0,
        });
        return result.actualAmount === 0 && result.sessionCoveredAmount === result.originalAmount;
      }),
    );
  });
});
