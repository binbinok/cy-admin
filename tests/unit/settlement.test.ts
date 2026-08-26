import { describe, it, expect } from 'vitest';
import { validateSettlementInput } from '@/utils/settlement';

const validInput = {
  baseItemId: 'item_1',
  adjustAmount: 0,
  adjustReason: '',
  paymentTotal: 20000,
  actualAmount: 20000,
  customAddons: [] as Array<{ name: string; price: number; reason: string }>,
};

describe('结算入参校验', () => {
  it('合法输入通过校验', () => {
    expect(validateSettlementInput(validInput)).toBeNull();
  });

  it('未选择基础项目时拒绝', () => {
    expect(validateSettlementInput({ ...validInput, baseItemId: '' })).toBe('请选择 1 个基础项目');
  });

  it('改价非 0 但未填写原因时拒绝', () => {
    expect(validateSettlementInput({ ...validInput, adjustAmount: -3000 })).toBe('改价必须填写原因');
    expect(validateSettlementInput({ ...validInput, adjustAmount: 1000, adjustReason: '  ' })).toBe('改价必须填写原因');
  });

  it('改价非 0 且填写原因时通过', () => {
    expect(
      validateSettlementInput({ ...validInput, adjustAmount: -2000, adjustReason: '老顾客优惠', actualAmount: 18000, paymentTotal: 18000 }),
    ).toBeNull();
  });

  it('实收金额小于 0 时拒绝', () => {
    expect(validateSettlementInput({ ...validInput, actualAmount: -100 })).toBe('实收金额不能小于 0');
  });

  it('支付总额不等于实收金额时拒绝', () => {
    expect(validateSettlementInput({ ...validInput, paymentTotal: 19999 })).toBe('支付总额必须等于实收金额');
  });

  it('自定义附加项缺少名称 / 金额 / 原因时拒绝', () => {
    expect(
      validateSettlementInput({
        ...validInput,
        customAddons: [{ name: '', price: 1000, reason: '加急' }],
      }),
    ).toBe('自定义附加项必须填写名称、金额和原因');
    expect(
      validateSettlementInput({
        ...validInput,
        customAddons: [{ name: '加钻', price: 0, reason: '加急' }],
      }),
    ).toBe('自定义附加项必须填写名称、金额和原因');
    expect(
      validateSettlementInput({
        ...validInput,
        customAddons: [{ name: '加钻', price: 1000, reason: '' }],
      }),
    ).toBe('自定义附加项必须填写名称、金额和原因');
  });

  it('自定义附加项完整时通过', () => {
    expect(
      validateSettlementInput({
        ...validInput,
        customAddons: [{ name: '加钻', price: 1000, reason: '顾客要求' }],
      }),
    ).toBeNull();
  });
});
