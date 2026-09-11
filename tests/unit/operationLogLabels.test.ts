import { describe, expect, it } from 'vitest';
import operationLogLabels from '@/constants/operation-log';
import { OperationAction } from '@/types/common';

describe('operationLogLabels', () => {
  it('所有 OperationAction 枚举值都有中文标签', () => {
    Object.values(OperationAction).forEach((action) => {
      expect(operationLogLabels.action[action]).toBeTruthy();
    });
  });

  it('formatAction 返回已知类型的中文标签', () => {
    expect(operationLogLabels.formatAction('login')).toBe('登录');
    expect(operationLogLabels.formatAction('create_member_card')).toBe(
      '开通会员卡'
    );
  });

  it('formatAction 对未知类型回退为原始值', () => {
    expect(operationLogLabels.formatAction('unknown_action')).toBe(
      'unknown_action'
    );
  });

  it('formatTargetType 返回已知对象类型的中文标签', () => {
    expect(operationLogLabels.formatTargetType('member_card')).toBe('会员卡');
    expect(operationLogLabels.formatTargetType('consumption_record')).toBe(
      '消费记录'
    );
  });

  it('formatTargetType 对未知类型回退为原始值', () => {
    expect(operationLogLabels.formatTargetType('other')).toBe('other');
  });
});
