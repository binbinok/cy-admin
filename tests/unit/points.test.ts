import { describe, it, expect } from 'vitest';
import { calculatePoints } from '../../src/utils/points';

describe('calculatePoints', () => {
  it('should return 0 points for 0 fen', () => {
    expect(calculatePoints(0)).toBe(0);
  });

  it('should return 0 points for amounts less than 10 fen', () => {
    expect(calculatePoints(1)).toBe(0);
    expect(calculatePoints(9)).toBe(0);
  });

  it('should return 1 point for exactly 10 fen (1 角)', () => {
    expect(calculatePoints(10)).toBe(1);
  });

  it('should floor the result for non-exact multiples', () => {
    expect(calculatePoints(15)).toBe(1);
    expect(calculatePoints(19)).toBe(1);
    expect(calculatePoints(99)).toBe(9);
  });

  it('should calculate correctly for typical amounts', () => {
    // 100 fen = 1 yuan → 10 points
    expect(calculatePoints(100)).toBe(10);
    // 9900 fen = 99 yuan → 990 points
    expect(calculatePoints(9900)).toBe(990);
    // 10000 fen = 100 yuan → 1000 points
    expect(calculatePoints(10000)).toBe(1000);
  });

  it('should return 0 for negative amounts', () => {
    expect(calculatePoints(-1)).toBe(0);
    expect(calculatePoints(-100)).toBe(0);
  });
});
