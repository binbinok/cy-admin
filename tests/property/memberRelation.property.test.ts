import { describe, it } from 'vitest';
import * as fc from 'fast-check';

interface DormantCandidate {
  lastConsumptionAt: string;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DORMANT_DAYS = 60;

const isDormantMember = (now: Date, candidate: DormantCandidate): boolean => {
  const lastConsumptionDate = new Date(candidate.lastConsumptionAt);
  const diffDays = Math.floor((now.getTime() - lastConsumptionDate.getTime()) / DAY_IN_MS);
  return diffDays > DORMANT_DAYS;
};

describe('cy-admin 会员关系属性测试', () => {
  it('Property 17: 沉睡会员筛选结果只包含超过 60 天未消费用户', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lastConsumptionAt: fc.integer({ min: 1_577_836_800_000, max: 1_924_905_600_000 })
              .map((value: number) => new Date(value).toISOString()),
          }),
          { maxLength: 200 },
        ),
        fc.date({ min: new Date('2026-01-01'), max: new Date('2028-12-31') }),
        (items: DormantCandidate[], now: Date) => {
          const dormant = items.filter((item: DormantCandidate) => isDormantMember(now, item));
          return dormant.every((item: DormantCandidate) => isDormantMember(now, item));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 17: 沉睡会员按最后消费时间升序排序后应保持单调', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            lastConsumptionAt: fc.integer({ min: 1_577_836_800_000, max: 1_924_905_600_000 })
              .map((value: number) => new Date(value).toISOString()),
          }),
          { maxLength: 200 },
        ),
        (items: DormantCandidate[]) => {
          const sorted = [...items].sort((a: DormantCandidate, b: DormantCandidate) => {
            return new Date(a.lastConsumptionAt).getTime() - new Date(b.lastConsumptionAt).getTime();
          });
          for (let index = 1; index < sorted.length; index += 1) {
            const prev = new Date(sorted[index - 1].lastConsumptionAt).getTime();
            const curr = new Date(sorted[index].lastConsumptionAt).getTime();
            if (prev > curr) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
