import { describe, it, expect } from 'vitest';
import { calculateCommission } from '../../src/utils/commission';

describe('calculateCommission', () => {
  it('should use default rate of 30% when rate is not provided', () => {
    // 10000 fen * 30 / 100 = 3000 fen
    expect(calculateCommission(10000)).toBe(3000);
  });

  it('should calculate correctly with a custom rate', () => {
    // 10000 fen * 50 / 100 = 5000 fen
    expect(calculateCommission(10000, 50)).toBe(5000);
  });

  it('should floor the result for non-exact divisions', () => {
    // 333 * 30 / 100 = 99.9 → 99
    expect(calculateCommission(333, 30)).toBe(99);
    // 1 * 30 / 100 = 0.3 → 0
    expect(calculateCommission(1, 30)).toBe(0);
  });

  it('should return 0 for serviceAmount of 0', () => {
    expect(calculateCommission(0)).toBe(0);
    expect(calculateCommission(0, 50)).toBe(0);
  });

  it('should return 0 for negative serviceAmount', () => {
    expect(calculateCommission(-100)).toBe(0);
    expect(calculateCommission(-1, 50)).toBe(0);
  });

  it('should handle rate boundaries (1% and 100%)', () => {
    // 10000 * 1 / 100 = 100
    expect(calculateCommission(10000, 1)).toBe(100);
    // 10000 * 100 / 100 = 10000
    expect(calculateCommission(10000, 100)).toBe(10000);
  });

  it('should calculate correctly for typical service amounts', () => {
    // 5000 fen (50 yuan) at 30% → 1500 fen
    expect(calculateCommission(5000)).toBe(1500);
    // 19900 fen (199 yuan) at 30% → 5970 fen
    expect(calculateCommission(19900)).toBe(5970);
  });
});
