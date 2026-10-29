import { describe, expect, it } from 'vitest';
import { holdStep } from './HoldNumberInput';

describe('holdStep', () => {
  it('押し続けるほど1回の増減量が大きくなる', () => {
    expect([0, 9, 10, 24, 25, 49, 50, 500].map(holdStep)).toEqual([1, 1, 2, 2, 5, 5, 10, 10]);
  });
  it('単調に増える', () => {
    let prev = 0;
    for (let t = 0; t < 200; t++) {
      expect(holdStep(t)).toBeGreaterThanOrEqual(prev);
      prev = holdStep(t);
    }
  });
});
