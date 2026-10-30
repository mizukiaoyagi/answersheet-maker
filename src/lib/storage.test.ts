import { beforeEach, describe, expect, it } from 'vitest';
import { loadState } from './storage';

/** localStorage の代わり */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

const KEY = 'answersheet-maker:v1';
const base = { id: 'a', major: '1', sub: '1', typeManual: false, points: 5 };

describe('古い保存データの読み込み', () => {
  beforeEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  const load = (questions: unknown[]) => {
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage({
      [KEY]: JSON.stringify({ meta: {}, questions }),
    });
    return loadState()!.questions;
  };

  it('マス目の字数（数）は、マス目あり（真）になる', () => {
    const [a, b] = load([
      { ...base, type: 'word', answer: 'ニュートン', grid: 5 },
      { ...base, id: 'b', type: 'word', answer: 'あ' },
    ]);
    expect(a.grid).toBe(true);
    expect(b.grid).toBeUndefined();
  });

  it('種類「カスタム」は、大きさ・マス目の指定に直る', () => {
    const [a] = load([
      { ...base, type: 'custom', typeManual: true, answer: '漢字', custom: { w: 4, rows: 2, grid: true } },
    ]);
    expect(a.type).toBe('word');
    expect(a.typeManual).toBe(false);
    expect(a.size).toEqual({ w: 4, rows: 2 });
    expect(a.grid).toBe(true);
    expect('custom' in a).toBe(false);
  });
});
