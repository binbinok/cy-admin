import { describe, expect, it } from 'vitest';
import { toArray } from '@/pages/commission/CommissionPage';

describe('commission toArray normalization', () => {
  it('returns array directly', () => {
    const input = [{ id: 1 }, { id: 2 }];
    expect(toArray(input)).toEqual(input);
  });

  it('unwraps { list: [...] } wrapper', () => {
    const list = [{ id: 1 }];
    expect(toArray({ list })).toEqual(list);
  });

  it('returns empty array for undefined', () => {
    expect(toArray(undefined)).toEqual([]);
  });

  it('returns empty array for plain object without list', () => {
    expect(toArray({ total: 10 })).toEqual([]);
  });

  it('returns empty array for string', () => {
    expect(toArray('not an array')).toEqual([]);
  });
});
