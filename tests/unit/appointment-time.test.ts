import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  computeTimeRange,
  hasTimeConflict,
  findConflictSlot,
  resolveSlotDuration,
} from '@/utils/appointment';

describe('预约时段计算', () => {
  it('解析 HH:mm 为分钟数', () => {
    expect(parseTimeToMinutes('09:30')).toBe(570);
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('23:59')).toBe(1439);
  });

  it('占用区间为 [开始, 开始 + 时长)', () => {
    const range = computeTimeRange('14:00', 120);
    expect(range).toEqual({ startMinutes: 840, endMinutes: 960 });
  });

  it('时段重叠判定：相交冲突，相邻不冲突', () => {
    const existing = computeTimeRange('14:00', 120);
    expect(hasTimeConflict(computeTimeRange('15:00', 60), existing)).toBe(true);
    expect(hasTimeConflict(computeTimeRange('13:30', 60), existing)).toBe(true);
    expect(hasTimeConflict(computeTimeRange('16:00', 60), existing)).toBe(false);
    expect(hasTimeConflict(computeTimeRange('13:00', 60), existing)).toBe(false);
  });

  it('历史预约时长兜底：duration > serviceDuration > 默认 60 分钟', () => {
    expect(resolveSlotDuration({ appointmentTime: '10:00', duration: 90 })).toBe(90);
    expect(resolveSlotDuration({ appointmentTime: '10:00', serviceDuration: 45 })).toBe(45);
    expect(resolveSlotDuration({ appointmentTime: '10:00' })).toBe(60);
  });

  it('findConflictSlot 返回冲突预约或 null', () => {
    const existing = [
      { appointmentTime: '14:00', duration: 120 },
      { appointmentTime: '18:00', duration: 60 },
    ];
    expect(findConflictSlot('15:00', 60, existing)).toEqual(existing[0]);
    expect(findConflictSlot('16:00', 60, existing)).toBeNull();
    expect(findConflictSlot('17:00', 60, existing)).toBeNull();
    expect(findConflictSlot('17:30', 60, existing)).toEqual(existing[1]);
  });
});
