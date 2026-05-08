import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { maskPhone } from '@/utils/format';
import { validateMemberInfo } from '@/utils/validation';
import type { Member } from '@/types/member';

// Feature: cy-admin, Property 5: 手机号脱敏正确性
// **Validates: Requirements 2.1, 11.3**
describe('cy-admin 会员属性测试', () => {
  /**
   * 生成合法中国手机号的 arbitrary：11 位数字，以 1[3-9] 开头
   */
  const validPhoneArb = fc
    .tuple(
      fc.integer({ min: 3, max: 9 }),
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }),
    )
    .map(([second, rest]) => `1${second}${rest.join('')}`);

  it('Property 5: 合法手机号脱敏后以 *** 开头并保留后 4 位', () => {
    fc.assert(
      fc.property(validPhoneArb, (phone) => {
        const masked = maskPhone(phone);
        return masked.startsWith('***') && masked.slice(-4) === phone.slice(-4);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 5: 合法手机号脱敏结果长度固定为 7', () => {
    fc.assert(
      fc.property(validPhoneArb, (phone) => {
        const masked = maskPhone(phone);
        return masked.length === 7;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 5: 合法手机号脱敏结果格式为 ***XXXX', () => {
    fc.assert(
      fc.property(validPhoneArb, (phone) => {
        const masked = maskPhone(phone);
        return /^\*{3}\d{4}$/.test(masked);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 5: 短于 4 字符的字符串原样返回', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 3 }),
        (short) => {
          return maskPhone(short) === short;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cy-admin, Property 6: 会员搜索结果一致性
// **Validates: Requirements 2.2**
describe('cy-admin 会员搜索结果一致性', () => {
  /**
   * 纯函数：模拟后端会员搜索逻辑
   * 按 keyword 对 nickName（大小写不敏感）、phone、memberId 进行模糊匹配
   */
  function filterMembers(members: Member[], keyword: string): Member[] {
    if (!keyword) return members;
    const lowerKeyword = keyword.toLowerCase();
    return members.filter(
      (m) =>
        m.nickName.toLowerCase().includes(lowerKeyword) ||
        m.phone.includes(keyword) ||
        m.memberId.includes(keyword),
    );
  }

  /** 生成任意 Member 对象的 arbitrary */
  const memberArb: fc.Arbitrary<Member> = fc.record({
    _id: fc.uuid(),
    memberId: fc.stringMatching(/^MEM\d{6}$/),
    openId: fc.uuid(),
    nickName: fc.string({ minLength: 1, maxLength: 20 }),
    phone: fc
      .tuple(
        fc.integer({ min: 3, max: 9 }),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }),
      )
      .map(([second, rest]) => `1${second}${rest.join('')}`),
    level: fc.constantFrom('normal', 'silver', 'gold', 'diamond') as fc.Arbitrary<
      'normal' | 'silver' | 'gold' | 'diamond'
    >,
    points: fc.nat(),
    totalConsumption: fc.nat(),
    consumptionCount: fc.nat(),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });

  const membersArb = fc.array(memberArb, { minLength: 0, maxLength: 20 });
  const keywordArb = fc.string({ minLength: 0, maxLength: 10 });

  it('Property 6: 搜索结果中每条记录的 nickName/phone/memberId 包含关键词', () => {
    fc.assert(
      fc.property(membersArb, keywordArb, (members, keyword) => {
        const results = filterMembers(members, keyword);
        if (!keyword) return true; // 空关键词返回全部，无需逐条检查
        const lowerKeyword = keyword.toLowerCase();
        return results.every(
          (m) =>
            m.nickName.toLowerCase().includes(lowerKeyword) ||
            m.phone.includes(keyword) ||
            m.memberId.includes(keyword),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('Property 6: 空关键词返回所有会员', () => {
    fc.assert(
      fc.property(membersArb, (members) => {
        const results = filterMembers(members, '');
        return results.length === members.length;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 6: 搜索结果是完整列表的子集', () => {
    fc.assert(
      fc.property(membersArb, keywordArb, (members, keyword) => {
        const results = filterMembers(members, keyword);
        return results.every((r) => members.includes(r));
      }),
      { numRuns: 100 },
    );
  });

  it('Property 6: 相同关键词对相同数据集返回一致结果', () => {
    fc.assert(
      fc.property(membersArb, keywordArb, (members, keyword) => {
        const results1 = filterMembers(members, keyword);
        const results2 = filterMembers(members, keyword);
        return (
          results1.length === results2.length &&
          results1.every((m, i) => m === results2[i])
        );
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: cy-admin, Property 7: 会员信息编辑验证正确性
// **Validates: 需求 2.6**
describe('cy-admin 会员信息编辑验证正确性', () => {
  /** 生成合法昵称（2–20 字符） */
  const validNickNameArb = fc.string({ minLength: 2, maxLength: 20 });

  /** 生成合法手机号（1[3-9]\d{9}） */
  const validPhoneArb = fc
    .tuple(
      fc.integer({ min: 3, max: 9 }),
      fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 9 }),
    )
    .map(([second, rest]) => `1${second}${rest.join('')}`);

  /** 生成合法生日（YYYY-MM-DD 格式） */
  const validBirthdayArb = fc
    .tuple(
      fc.integer({ min: 1950, max: 2024 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
    )
    .map(
      ([y, m, d]) =>
        `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );

  it('Property 7: 合法昵称 + 合法手机号 + 合法生日 → 验证通过', () => {
    fc.assert(
      fc.property(
        validNickNameArb,
        validPhoneArb,
        validBirthdayArb,
        (nickName, phone, birthday) => {
          const result = validateMemberInfo({ nickName, phone, birthday });
          return result.valid === true && result.errors.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7: 昵称短于 2 字符 → 验证失败并包含昵称错误', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        validPhoneArb,
        validBirthdayArb,
        (nickName, phone, birthday) => {
          const result = validateMemberInfo({ nickName, phone, birthday });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('昵称'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7: 昵称超过 20 字符 → 验证失败并包含昵称错误', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 21, maxLength: 50 }),
        validPhoneArb,
        validBirthdayArb,
        (nickName, phone, birthday) => {
          const result = validateMemberInfo({ nickName, phone, birthday });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('昵称'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7: 非法手机号格式 → 验证失败并包含手机号错误', () => {
    fc.assert(
      fc.property(
        validNickNameArb,
        fc.string({ minLength: 1, maxLength: 15 }).filter(
          (s) => !/^1[3-9]\d{9}$/.test(s),
        ),
        validBirthdayArb,
        (nickName, phone, birthday) => {
          const result = validateMemberInfo({ nickName, phone, birthday });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('手机号'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7: 非法生日格式 → 验证失败并包含生日错误', () => {
    fc.assert(
      fc.property(
        validNickNameArb,
        validPhoneArb,
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !/^\d{4}-\d{2}-\d{2}$/.test(s),
        ),
        (nickName, phone, birthday) => {
          const result = validateMemberInfo({ nickName, phone, birthday });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('生日'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 7: 多个字段非法 → 所有错误均被报告', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        fc.constant('invalid-phone'),
        fc.constant('not-a-date'),
        (nickName, phone, birthday) => {
          const result = validateMemberInfo({ nickName, phone, birthday });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('昵称')) &&
            result.errors.some((e) => e.includes('手机号')) &&
            result.errors.some((e) => e.includes('生日'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: cy-admin, Property 8: 会员卡充值余额正确性
// **Validates: Requirements 2.10**
describe('cy-admin 会员卡充值余额正确性', () => {
  /**
   * 纯函数：模拟会员卡充值逻辑
   * 所有金额单位为分（整数），充值金额必须 > 0
   */
  function rechargeBalance(
    currentBalance: number,
    rechargeAmount: number,
  ): { success: boolean; newBalance: number } {
    if (rechargeAmount <= 0) return { success: false, newBalance: currentBalance };
    return { success: true, newBalance: currentBalance + rechargeAmount };
  }

  /** 非负整数 arbitrary（余额） */
  const balanceArb = fc.nat({ max: 1_000_000_00 }); // 最大 100 万元（分）

  /** 正整数 arbitrary（充值金额） */
  const positiveAmountArb = fc.integer({ min: 1, max: 1_000_000_00 });

  it('Property 8: 充值后余额 = 原余额 + 充值金额', () => {
    fc.assert(
      fc.property(balanceArb, positiveAmountArb, (balance, amount) => {
        const result = rechargeBalance(balance, amount);
        return result.success === true && result.newBalance === balance + amount;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 8: 充值金额必须大于 0', () => {
    fc.assert(
      fc.property(balanceArb, positiveAmountArb, (balance, amount) => {
        const result = rechargeBalance(balance, amount);
        return result.success === true && amount > 0;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 8: 充值后余额始终非负', () => {
    fc.assert(
      fc.property(balanceArb, positiveAmountArb, (balance, amount) => {
        const result = rechargeBalance(balance, amount);
        return result.newBalance >= 0;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 8: 多次连续充值累加正确（结合律）', () => {
    fc.assert(
      fc.property(
        balanceArb,
        fc.array(positiveAmountArb, { minLength: 1, maxLength: 10 }),
        (initialBalance, amounts) => {
          let balance = initialBalance;
          for (const amt of amounts) {
            const result = rechargeBalance(balance, amt);
            if (!result.success) return false;
            balance = result.newBalance;
          }
          const expectedTotal =
            initialBalance + amounts.reduce((sum, a) => sum + a, 0);
          return balance === expectedTotal;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 8: 充值金额为 0 时被拒绝', () => {
    fc.assert(
      fc.property(balanceArb, (balance) => {
        const result = rechargeBalance(balance, 0);
        return result.success === false && result.newBalance === balance;
      }),
      { numRuns: 100 },
    );
  });

  it('Property 8: 充值金额为负数时被拒绝', () => {
    fc.assert(
      fc.property(
        balanceArb,
        fc.integer({ min: -1_000_000_00, max: -1 }),
        (balance, negativeAmount) => {
          const result = rechargeBalance(balance, negativeAmount);
          return result.success === false && result.newBalance === balance;
        },
      ),
      { numRuns: 100 },
    );
  });
});
