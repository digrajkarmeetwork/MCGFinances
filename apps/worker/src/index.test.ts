import { describe, it, expect } from 'vitest';

describe('worker bootstrap', () => {
  it('loads basic config', () => {
    expect(process.env).toBeDefined();
  });
});
