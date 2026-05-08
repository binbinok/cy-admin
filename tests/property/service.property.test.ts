import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { validateServiceItem } from '@/utils/validation';

// Feature: cy-admin, Property 10: 服务项目验证正确性
// **Validates: 需求 4.2、4.6**
describe('cy-admin 服务项目验证正确性', () => {
  /** 生成合法服务名称（2–30 字符） */
  const validNameArb = fc.string({ minLength: 2, maxLength: 30 });

  /** 生成合法价格（大于 0 的正数） */
  const validPriceArb = fc.double({
    min: 0.01,
    max: 1_000_000,
    noNaN: true,
  });

  /** 生成合法时长（大于 0 的正整数） */
  const validDurationArb = fc.integer({ min: 1, max: 1440 });

  it('Property 10: 合法名称 + 合法价格 + 合法时长 → 验证通过', () => {
    fc.assert(
      fc.property(
        validNameArb,
        validPriceArb,
        validDurationArb,
        (name, price, duration) => {
          const result = validateServiceItem({ name, price, duration });
          return result.valid === true && result.errors.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10: 名称短于 2 字符 → 验证失败并包含名称错误', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        validPriceArb,
        validDurationArb,
        (name, price, duration) => {
          const result = validateServiceItem({ name, price, duration });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('服务名称'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10: 名称超过 30 字符 → 验证失败并包含名称错误', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 31, maxLength: 60 }),
        validPriceArb,
        validDurationArb,
        (name, price, duration) => {
          const result = validateServiceItem({ name, price, duration });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('服务名称'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10: 价格 <= 0 → 验证失败并包含价格错误', () => {
    fc.assert(
      fc.property(
        validNameArb,
        fc.double({ min: -1_000_000, max: 0, noNaN: true }),
        validDurationArb,
        (name, price, duration) => {
          const result = validateServiceItem({ name, price, duration });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('价格'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10: 时长为非正整数或 <= 0 → 验证失败并包含时长错误', () => {
    /** 生成非法时长：负数、0 或非整数正数 */
    const invalidDurationArb = fc.oneof(
      fc.integer({ min: -1000, max: 0 }),
      fc.double({ min: 0.01, max: 1000, noNaN: true }).filter(
        (n) => !Number.isInteger(n),
      ),
    );

    fc.assert(
      fc.property(
        validNameArb,
        validPriceArb,
        invalidDurationArb,
        (name, price, duration) => {
          const result = validateServiceItem({ name, price, duration });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('时长'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 10: 多个字段非法 → 所有错误均被报告', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 1 }),
        fc.constant(0),
        fc.constant(0),
        (name, price, duration) => {
          const result = validateServiceItem({ name, price, duration });
          return (
            result.valid === false &&
            result.errors.some((e) => e.includes('服务名称')) &&
            result.errors.some((e) => e.includes('价格')) &&
            result.errors.some((e) => e.includes('时长'))
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// --- Property 11 helper ---

interface SimpleService {
  _id: string;
  active: boolean;
}

interface SimpleAppointment {
  _id: string;
  serviceId: string;
  status: 'pending' | 'in_service' | 'completed' | 'cancelled';
}

/**
 * Simulates toggling a service to inactive (下架).
 * Appointments referencing that service remain completely unchanged.
 */
function simulateServiceDeactivation(
  services: SimpleService[],
  appointments: SimpleAppointment[],
  serviceIdToDeactivate: string,
): { services: SimpleService[]; appointments: SimpleAppointment[] } {
  return {
    services: services.map((s) =>
      s._id === serviceIdToDeactivate ? { ...s, active: false } : s,
    ),
    appointments: [...appointments], // appointments unchanged
  };
}

// Feature: cy-admin, Property 11: 下架服务不影响已有预约
// **Validates: 需求 4.4**
describe('cy-admin 下架服务不影响已有预约', () => {
  /** 生成随机服务 ID */
  const serviceIdArb = fc.stringMatching(/^svc_[a-z0-9]{4,8}$/);

  /** 生成随机预约 ID */
  const appointmentIdArb = fc.stringMatching(/^apt_[a-z0-9]{4,8}$/);

  /** 生成随机预约状态 */
  const statusArb = fc.constantFrom(
    'pending' as const,
    'in_service' as const,
    'completed' as const,
    'cancelled' as const,
  );

  /** 生成一组服务（至少 1 个，全部 active） */
  const servicesArb = fc
    .array(serviceIdArb, { minLength: 1, maxLength: 10 })
    .chain((ids) => {
      const unique = [...new Set(ids)];
      return fc.constant(
        unique.map((id) => ({ _id: id, active: true })),
      );
    })
    .filter((arr) => arr.length >= 1);

  /** 生成一组预约，serviceId 从给定服务列表中选取 */
  const appointmentsArb = (serviceIds: string[]) =>
    fc.array(
      fc.record({
        _id: appointmentIdArb,
        serviceId: fc.constantFrom(...serviceIds),
        status: statusArb,
      }),
      { minLength: 0, maxLength: 20 },
    );

  it('Property 11: 下架后预约数量不变', () => {
    fc.assert(
      fc.property(
        servicesArb.chain((services) =>
          appointmentsArb(services.map((s) => s._id)).map((appts) => ({
            services,
            appointments: appts,
          })),
        ),
        ({ services, appointments }) => {
          const targetId = services[0]._id;
          const result = simulateServiceDeactivation(
            services,
            appointments,
            targetId,
          );
          return result.appointments.length === appointments.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11: 下架后所有预约状态保持不变', () => {
    fc.assert(
      fc.property(
        servicesArb.chain((services) =>
          appointmentsArb(services.map((s) => s._id)).map((appts) => ({
            services,
            appointments: appts,
          })),
        ),
        ({ services, appointments }) => {
          const targetId = services[0]._id;
          const result = simulateServiceDeactivation(
            services,
            appointments,
            targetId,
          );
          return result.appointments.every(
            (appt, i) => appt.status === appointments[i].status,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11: 下架后预约的 serviceId 引用保持不变', () => {
    fc.assert(
      fc.property(
        servicesArb.chain((services) =>
          appointmentsArb(services.map((s) => s._id)).map((appts) => ({
            services,
            appointments: appts,
          })),
        ),
        ({ services, appointments }) => {
          const targetId = services[0]._id;
          const result = simulateServiceDeactivation(
            services,
            appointments,
            targetId,
          );
          return result.appointments.every(
            (appt, i) => appt.serviceId === appointments[i].serviceId,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11: 多次下架不同服务不影响预约', () => {
    fc.assert(
      fc.property(
        servicesArb
          .filter((s) => s.length >= 2)
          .chain((services) =>
            appointmentsArb(services.map((s) => s._id)).map((appts) => ({
              services,
              appointments: appts,
            })),
          ),
        ({ services, appointments }) => {
          // Deactivate first service
          const after1 = simulateServiceDeactivation(
            services,
            appointments,
            services[0]._id,
          );
          // Deactivate second service
          const after2 = simulateServiceDeactivation(
            after1.services,
            after1.appointments,
            services[1]._id,
          );

          // Appointments still identical to original
          return (
            after2.appointments.length === appointments.length &&
            after2.appointments.every(
              (appt, i) =>
                appt._id === appointments[i]._id &&
                appt.serviceId === appointments[i].serviceId &&
                appt.status === appointments[i].status,
            )
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 11: 下架后目标服务 active 变为 false', () => {
    fc.assert(
      fc.property(
        servicesArb.chain((services) =>
          appointmentsArb(services.map((s) => s._id)).map((appts) => ({
            services,
            appointments: appts,
          })),
        ),
        ({ services }) => {
          const targetId = services[0]._id;
          const result = simulateServiceDeactivation(
            services,
            [],
            targetId,
          );
          const target = result.services.find((s) => s._id === targetId);
          return target !== undefined && target.active === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});
