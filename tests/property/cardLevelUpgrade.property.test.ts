import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getUpgradeTargetLevel, sortCardLevels } from '@/utils/cardLevel';

interface TestLevel {
  _id: string;
  minRechargeAmount: number;
  discountRate: number;
}

const levelArb = (id: string): fc.Arbitrary<TestLevel> =>
  fc.record({
    _id: fc.constant(id),
    minRechargeAmount: fc.nat({ max: 1_000_000 }),
    discountRate: fc.integer({ min: 1, max: 100 }),
  });

const levelsArb: fc.Arbitrary<TestLevel[]> = fc
  .uniqueArray(fc.nat({ max: 10_000 }), { minLength: 1, maxLength: 6 })
  .chain((ids) =>
    fc.tuple(...ids.map((n) => levelArb(`L${n}`))),
  )
  .map((levels) => levels as TestLevel[]);

// Feature: add-member-card-level-upgrade, 充值达标自动升级判定
describe('会员卡充值升级判定属性测试', () => {
  it('升级目标必然满足：门槛>0、门槛<=充值金额、排序高于当前等级', () => {
    fc.assert(
      fc.property(levelsArb, fc.nat({ max: 1_000_000 }), (levels, amountFen) => {
        const sorted = sortCardLevels(levels);
        const current = sorted[0];
        const target = getUpgradeTargetLevel({
          levels,
          currentLevelId: current._id,
          amountFen,
        });
        if (!target) {
          return true;
        }
        const targetRank = sorted.findIndex((l) => l._id === target._id);
        return (
          target.minRechargeAmount > 0 &&
          target.minRechargeAmount <= amountFen &&
          targetRank > 0
        );
      }),
      { numRuns: 100 },
    );
  });

  it('升级目标必是满足条件的最高等级（跨级直达）', () => {
    fc.assert(
      fc.property(levelsArb, fc.nat({ max: 1_000_000 }), (levels, amountFen) => {
        const sorted = sortCardLevels(levels);
        const current = sorted[0];
        const target = getUpgradeTargetLevel({
          levels,
          currentLevelId: current._id,
          amountFen,
        });
        const qualified = sorted.filter(
          (l, idx) => idx > 0 && l.minRechargeAmount > 0 && l.minRechargeAmount <= amountFen,
        );
        const expected = qualified.length > 0 ? qualified[qualified.length - 1] : undefined;
        return (target?._id ?? undefined) === (expected?._id ?? undefined);
      }),
      { numRuns: 100 },
    );
  });

  it('只升不降：充值金额低于所有更高等级门槛时不产生升级目标', () => {
    fc.assert(
      fc.property(levelsArb, (levels) => {
        const sorted = sortCardLevels(levels);
        const current = sorted[sorted.length - 1];
        const target = getUpgradeTargetLevel({
          levels,
          currentLevelId: current._id,
          amountFen: 1_000_000,
        });
        return target === undefined;
      }),
      { numRuns: 100 },
    );
  });

  it('当前等级缺失时按最低级处理，任何达标等级均可成为目标', () => {
    fc.assert(
      fc.property(levelsArb, fc.nat({ max: 1_000_000 }), (levels, amountFen) => {
        const target = getUpgradeTargetLevel({
          levels,
          currentLevelId: 'NOT_EXIST',
          amountFen,
        });
        const sorted = sortCardLevels(levels);
        const qualified = sorted.filter(
          (l) => l.minRechargeAmount > 0 && l.minRechargeAmount <= amountFen,
        );
        const expected = qualified.length > 0 ? qualified[qualified.length - 1] : undefined;
        return (target?._id ?? undefined) === (expected?._id ?? undefined);
      }),
      { numRuns: 100 },
    );
  });

  it('门槛为 0 的等级永远不会成为升级目标', () => {
    fc.assert(
      fc.property(levelsArb, fc.nat({ max: 1_000_000 }), (levels, amountFen) => {
        const target = getUpgradeTargetLevel({
          levels,
          currentLevelId: undefined,
          amountFen,
        });
        return !target || target.minRechargeAmount > 0;
      }),
      { numRuns: 100 },
    );
  });
});

describe('会员卡等级排序', () => {
  it('门槛相同按折扣率小者为高', () => {
    const levels: TestLevel[] = [
      { _id: 'A', minRechargeAmount: 10000, discountRate: 90 },
      { _id: 'B', minRechargeAmount: 10000, discountRate: 80 },
    ];
    const sorted = sortCardLevels(levels);
    expect(sorted.map((l) => l._id)).toEqual(['A', 'B']);
    const target = getUpgradeTargetLevel({
      levels,
      currentLevelId: undefined,
      amountFen: 10000,
    });
    expect(target?._id).toBe('B');
  });
});
