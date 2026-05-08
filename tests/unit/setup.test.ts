import { describe, it, expect } from 'vitest';

describe('Project setup', () => {
  it('should have vitest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should support path alias @/', async () => {
    const App = await import('@/App');
    expect(App).toBeDefined();
  }, 15000);
});
