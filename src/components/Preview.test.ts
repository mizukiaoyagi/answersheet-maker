import { describe, expect, it } from 'vitest';
import { zoomed } from './Preview';

describe('zoomed（プレビューの拡大・縮小）', () => {
  it('1回で1.25倍、または 1/1.25 倍', () => {
    expect(zoomed(1, 1)).toBe(1.25);
    expect(zoomed(1, -1)).toBe(0.8);
  });
  it('拡大してから縮小すると、ほぼ元の大きさに戻る', () => {
    expect(zoomed(zoomed(1, 1), -1)).toBeCloseTo(1, 2);
  });
  it('範囲（0.4〜4倍）を超えない', () => {
    let z = 1;
    for (let i = 0; i < 50; i++) z = zoomed(z, 1);
    expect(z).toBe(4);
    for (let i = 0; i < 50; i++) z = zoomed(z, -1);
    expect(z).toBe(0.4);
  });
});
