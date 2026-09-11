export const SLOT_MINUTES = 30;
export const SLOT_HEIGHT_PX = 32;
export const FALLBACK_DURATION_MINUTES = 60;
export const DEFAULT_RANGE_START = '10:00';
export const DEFAULT_RANGE_END = '22:00';

export interface BoardTimeRange {
  readonly startMinutes: number;
  readonly endMinutes: number;
}

export interface BlockPosition {
  readonly top: number;
  readonly height: number;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function deriveBoardTimeRange(params: {
  schedules: readonly { readonly startTime: string; readonly endTime: string }[];
  appointments?: readonly { readonly appointmentTime: string; readonly duration?: number }[];
}): BoardTimeRange {
  const points: number[] = [];
  for (const slot of params.schedules) {
    points.push(timeToMinutes(slot.startTime), timeToMinutes(slot.endTime));
  }
  for (const item of params.appointments ?? []) {
    const start = timeToMinutes(item.appointmentTime);
    const duration = item.duration && item.duration > 0 ? item.duration : FALLBACK_DURATION_MINUTES;
    points.push(start, start + duration);
  }
  if (points.length === 0) {
    return {
      startMinutes: timeToMinutes(DEFAULT_RANGE_START),
      endMinutes: timeToMinutes(DEFAULT_RANGE_END),
    };
  }
  return {
    startMinutes: Math.floor(Math.min(...points) / 60) * 60,
    endMinutes: Math.ceil(Math.max(...points) / 60) * 60,
  };
}

export function getBlockPosition(params: {
  startTime: string;
  durationMinutes?: number;
  rangeStartMinutes: number;
}): BlockPosition {
  const start = timeToMinutes(params.startTime);
  const duration =
    params.durationMinutes && params.durationMinutes > 0
      ? params.durationMinutes
      : FALLBACK_DURATION_MINUTES;
  return {
    top: ((start - params.rangeStartMinutes) / SLOT_MINUTES) * SLOT_HEIGHT_PX,
    height: (duration / SLOT_MINUTES) * SLOT_HEIGHT_PX,
  };
}
