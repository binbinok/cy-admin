export interface TimeRange {
  readonly startMinutes: number;
  readonly endMinutes: number;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function computeTimeRange(appointmentTime: string, duration: number): TimeRange {
  const startMinutes = parseTimeToMinutes(appointmentTime);
  return { startMinutes, endMinutes: startMinutes + duration };
}

export function hasTimeConflict(rangeA: TimeRange, rangeB: TimeRange): boolean {
  return rangeA.startMinutes < rangeB.endMinutes && rangeA.endMinutes > rangeB.startMinutes;
}

export interface ExistingAppointmentSlot {
  readonly appointmentTime: string;
  readonly duration?: number;
  readonly serviceDuration?: number;
}

const DEFAULT_SLOT_DURATION = 60;

export function resolveSlotDuration(slot: ExistingAppointmentSlot): number {
  return Number(slot.duration) || Number(slot.serviceDuration) || DEFAULT_SLOT_DURATION;
}

export function findConflictSlot(
  appointmentTime: string,
  duration: number,
  existingSlots: readonly ExistingAppointmentSlot[],
): ExistingAppointmentSlot | null {
  const newRange = computeTimeRange(appointmentTime, duration);
  const conflict = existingSlots.find((slot) =>
    hasTimeConflict(newRange, computeTimeRange(slot.appointmentTime, resolveSlotDuration(slot))),
  );
  return conflict ?? null;
}
