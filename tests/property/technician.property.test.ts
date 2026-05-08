import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import type { Appointment } from '@/types/appointment';

/**
 * Pure function under test: determines whether a technician can be deleted
 * based on their pending/in_service appointments.
 */
function canDeleteTechnician(
  technicianId: string,
  appointments: Appointment[],
): { allowed: boolean; pendingCount: number } {
  const pending = appointments.filter(
    (a) => a.technicianId === technicianId && (a.status === 'pending' || a.status === 'in_service'),
  );
  return { allowed: pending.length === 0, pendingCount: pending.length };
}

// --- Arbitraries ---

const statusArb = fc.constantFrom<Appointment['status']>(
  'pending',
  'in_service',
  'completed',
  'cancelled',
);

const technicianIdArb = fc.string({ minLength: 1, maxLength: 20 });

const appointmentArb = (techIdArb: fc.Arbitrary<string>): fc.Arbitrary<Appointment> =>
  fc.record({
    _id: fc.uuid(),
    appointmentId: fc.uuid(),
    memberId: fc.uuid(),
    serviceId: fc.uuid(),
    technicianId: techIdArb,
    appointmentDate: fc
      .tuple(
        fc.integer({ min: 2024, max: 2025 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
      )
      .map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
    appointmentTime: fc
      .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
      .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`),
    status: statusArb,
    actualAmount: fc.option(fc.nat({ max: 1_000_000 }), { nil: undefined }),
    remark: fc.option(fc.string({ maxLength: 50 }), { nil: undefined }),
    createdAt: fc.date(),
    updatedAt: fc.date(),
  });

// Feature: cy-admin, Property 9: 技师删除保护
// **Validates: Requirements 3.9**
describe('cy-admin 技师删除保护属性测试', () => {
  it('Property 9: 无 pending/in_service 预约的技师 → 允许删除, pendingCount = 0', () => {
    const nonBlockingStatus = fc.constantFrom<Appointment['status']>('completed', 'cancelled');
    fc.assert(
      fc.property(
        technicianIdArb,
        fc.array(
          appointmentArb(technicianIdArb).chain((appt) =>
            nonBlockingStatus.map((s) => ({ ...appt, status: s })),
          ),
          { minLength: 0, maxLength: 15 },
        ),
        (techId, appointments) => {
          // Ensure all appointments for this technician are completed/cancelled
          const fixed = appointments.map((a) =>
            a.technicianId === techId
              ? { ...a, status: fc.sample(nonBlockingStatus, 1)[0] }
              : a,
          );
          const result = canDeleteTechnician(techId, fixed);
          return result.allowed === true && result.pendingCount === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9: 有 pending 预约的技师 → 不允许删除, pendingCount > 0', () => {
    fc.assert(
      fc.property(
        technicianIdArb,
        fc.array(appointmentArb(technicianIdArb), { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (techId, otherAppointments, pendingCount) => {
          // Create explicit pending appointments for this technician
          const pendingAppointments: Appointment[] = Array.from(
            { length: pendingCount },
            (_, i) => ({
              _id: `pending-${i}`,
              appointmentId: `appt-pending-${i}`,
              memberId: `member-${i}`,
              serviceId: `service-${i}`,
              technicianId: techId,
              appointmentDate: '2025-01-15',
              appointmentTime: '10:00',
              status: 'pending' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );
          const allAppointments = [...otherAppointments, ...pendingAppointments];
          const result = canDeleteTechnician(techId, allAppointments);
          return result.allowed === false && result.pendingCount >= pendingCount;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9: 有 in_service 预约的技师 → 不允许删除, pendingCount > 0', () => {
    fc.assert(
      fc.property(
        technicianIdArb,
        fc.array(appointmentArb(technicianIdArb), { minLength: 0, maxLength: 10 }),
        fc.integer({ min: 1, max: 5 }),
        (techId, otherAppointments, inServiceCount) => {
          const inServiceAppointments: Appointment[] = Array.from(
            { length: inServiceCount },
            (_, i) => ({
              _id: `in-service-${i}`,
              appointmentId: `appt-in-service-${i}`,
              memberId: `member-${i}`,
              serviceId: `service-${i}`,
              technicianId: techId,
              appointmentDate: '2025-01-15',
              appointmentTime: '14:00',
              status: 'in_service' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );
          const allAppointments = [...otherAppointments, ...inServiceAppointments];
          const result = canDeleteTechnician(techId, allAppointments);
          return result.allowed === false && result.pendingCount >= inServiceCount;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9: completed/cancelled 预约不阻止删除', () => {
    fc.assert(
      fc.property(
        technicianIdArb,
        fc.array(fc.integer({ min: 0, max: 1 }), { minLength: 1, maxLength: 15 }),
        (techId, statusIndices) => {
          const nonBlockingStatuses: Appointment['status'][] = ['completed', 'cancelled'];
          const appointments: Appointment[] = statusIndices.map((idx, i) => ({
            _id: `done-${i}`,
            appointmentId: `appt-done-${i}`,
            memberId: `member-${i}`,
            serviceId: `service-${i}`,
            technicianId: techId,
            appointmentDate: '2025-01-15',
            appointmentTime: '10:00',
            status: nonBlockingStatuses[idx],
            createdAt: new Date(),
            updatedAt: new Date(),
          }));
          const result = canDeleteTechnician(techId, appointments);
          return result.allowed === true && result.pendingCount === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 9: 只有匹配 technicianId 的预约被考虑', () => {
    fc.assert(
      fc.property(
        technicianIdArb,
        technicianIdArb.filter((id) => id.length > 0),
        fc.integer({ min: 1, max: 5 }),
        (targetTechId, otherTechId, count) => {
          // Ensure the two IDs are different
          const actualOtherId = targetTechId === otherTechId
            ? otherTechId + '_other'
            : otherTechId;

          // Create pending appointments for a DIFFERENT technician
          const otherAppointments: Appointment[] = Array.from(
            { length: count },
            (_, i) => ({
              _id: `other-${i}`,
              appointmentId: `appt-other-${i}`,
              memberId: `member-${i}`,
              serviceId: `service-${i}`,
              technicianId: actualOtherId,
              appointmentDate: '2025-01-15',
              appointmentTime: '10:00',
              status: 'pending' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            }),
          );
          const result = canDeleteTechnician(targetTechId, otherAppointments);
          return result.allowed === true && result.pendingCount === 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
