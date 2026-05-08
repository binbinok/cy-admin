import { describe, it, expect } from 'vitest';
import { maskPhone, formatAmount, formatDate } from '../../src/utils/format';

describe('maskPhone', () => {
  it('should mask a standard 11-digit phone number', () => {
    expect(maskPhone('13812345678')).toBe('***5678');
  });

  it('should show *** + last 4 digits for any phone >= 4 chars', () => {
    expect(maskPhone('1234')).toBe('***1234');
    expect(maskPhone('12345')).toBe('***2345');
  });

  it('should return as-is if phone is shorter than 4 chars', () => {
    expect(maskPhone('')).toBe('');
    expect(maskPhone('1')).toBe('1');
    expect(maskPhone('12')).toBe('12');
    expect(maskPhone('123')).toBe('123');
  });
});

describe('formatAmount', () => {
  it('should convert fen to yuan with 2 decimal places', () => {
    expect(formatAmount(9900)).toBe('99.00');
    expect(formatAmount(100)).toBe('1.00');
    expect(formatAmount(0)).toBe('0.00');
    expect(formatAmount(1)).toBe('0.01');
  });

  it('should handle large amounts', () => {
    expect(formatAmount(1000000)).toBe('10000.00');
  });

  it('should handle amounts that produce fractional yuan', () => {
    expect(formatAmount(199)).toBe('1.99');
    expect(formatAmount(50)).toBe('0.50');
  });
});

describe('formatDate', () => {
  it('should format a Date object to YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDate(date)).toBe('2024-01-15');
  });

  it('should format an ISO string to YYYY-MM-DD', () => {
    // Use a date string that produces a consistent local date
    const result = formatDate('2024-06-01T12:00:00');
    expect(result).toBe('2024-06-01');
  });

  it('should pad single-digit month and day', () => {
    const date = new Date(2024, 0, 5); // Jan 5, 2024
    expect(formatDate(date)).toBe('2024-01-05');
  });

  it('should handle December correctly', () => {
    const date = new Date(2024, 11, 31); // Dec 31, 2024
    expect(formatDate(date)).toBe('2024-12-31');
  });
});
