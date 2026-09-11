import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  DEFAULT_RANGE_END,
  DEFAULT_RANGE_START,
  FALLBACK_DURATION_MINUTES,
  SLOT_HEIGHT_PX,
  SLOT_MINUTES,
  deriveBoardTimeRange,
  getBlockPosition,
  minutesToTime,
  timeToMinutes,
} from '@/utils/schedule';

describe('timeToMinutes / minutesToTime', () => {
  it('互逆：合法时间字符串往返一致', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }), (h, m) => {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        return timeToMinutes(time) === h * 60 + m && minutesToTime(h * 60 + m) === time;
      }),
    );
  });

  it('解析示例', () => {
    expect(timeToMinutes('10:30')).toBe(630);
    expect(minutesToTime(630)).toBe('10:30');
  });
});

describe('deriveBoardTimeRange', () => {
  it('无排班且无预约时兜底 10:00–22:00', () => {
    const range = deriveBoardTimeRange({ schedules: [] });
    expect(range.startMinutes).toBe(timeToMinutes(DEFAULT_RANGE_START));
    expect(range.endMinutes).toBe(timeToMinutes(DEFAULT_RANGE_END));
  });

  it('按排班最早开始与最晚结束推导，并对齐到整点', () => {
    const range = deriveBoardTimeRange({
      schedules: [
        { startTime: '10:15', endTime: '14:00' },
        { startTime: '12:00', endTime: '20:45' },
      ],
    });
    expect(range.startMinutes).toBe(timeToMinutes('10:00'));
    expect(range.endMinutes).toBe(timeToMinutes('21:00'));
  });

  it('预约超出排班范围时扩展时间轴', () => {
    const range = deriveBoardTimeRange({
      schedules: [{ startTime: '10:00', endTime: '18:00' }],
      appointments: [{ appointmentTime: '21:30', duration: 60 }],
    });
    expect(range.startMinutes).toBe(timeToMinutes('10:00'));
    expect(range.endMinutes).toBe(timeToMinutes('23:00'));
  });

  it('仅预约无排班时按预约推导', () => {
    const range = deriveBoardTimeRange({
      schedules: [],
      appointments: [{ appointmentTime: '13:20', duration: 120 }],
    });
    expect(range.startMinutes).toBe(timeToMinutes('13:00'));
    expect(range.endMinutes).toBe(timeToMinutes('16:00'));
  });

  it('不变量：范围始终整点对齐且起点小于终点', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            startTime: fc.constantFrom('09:30', '10:15', '13:00', '18:45'),
            endTime: fc.constantFrom('12:00', '15:30', '20:00', '22:30'),
          }),
        ),
        (schedules) => {
          const valid = schedules.filter((s) => timeToMinutes(s.endTime) > timeToMinutes(s.startTime));
          const range = deriveBoardTimeRange({ schedules: valid });
          return (
            range.startMinutes % 60 === 0 &&
            range.endMinutes % 60 === 0 &&
            range.startMinutes < range.endMinutes
          );
        },
      ),
    );
  });
});

describe('getBlockPosition', () => {
  it('起点与高度按刻度和像素换算', () => {
    const pos = getBlockPosition({
      startTime: '11:00',
      durationMinutes: 90,
      rangeStartMinutes: timeToMinutes('10:00'),
    });
    expect(pos.top).toBe((60 / SLOT_MINUTES) * SLOT_HEIGHT_PX);
    expect(pos.height).toBe((90 / SLOT_MINUTES) * SLOT_HEIGHT_PX);
  });

  it('缺失或非法时长时按兜底时长渲染', () => {
    const pos = getBlockPosition({
      startTime: '10:00',
      rangeStartMinutes: timeToMinutes('10:00'),
    });
    expect(pos.top).toBe(0);
    expect(pos.height).toBe((FALLBACK_DURATION_MINUTES / SLOT_MINUTES) * SLOT_HEIGHT_PX);
    const zeroDuration = getBlockPosition({
      startTime: '10:00',
      durationMinutes: 0,
      rangeStartMinutes: timeToMinutes('10:00'),
    });
    expect(zeroDuration.height).toBe((FALLBACK_DURATION_MINUTES / SLOT_MINUTES) * SLOT_HEIGHT_PX);
  });

  it('跨 30 分钟刻度的开始时间按分钟精确定位', () => {
    const pos = getBlockPosition({
      startTime: '10:15',
      durationMinutes: 30,
      rangeStartMinutes: timeToMinutes('10:00'),
    });
    expect(pos.top).toBe(SLOT_HEIGHT_PX / 2);
  });
});
