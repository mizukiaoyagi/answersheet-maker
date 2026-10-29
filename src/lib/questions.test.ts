import { describe, expect, it } from 'vitest';
import { emptyState, moveQuestion, nextQuestion } from './questions';
import type { Question } from './types';

const q = (id: string, sub = ''): Question => ({
  id,
  major: '2',
  sub,
  type: 'word',
  typeManual: false,
  answer: '',
  points: 5,
});
const ids = (qs: Question[]) => qs.map((x) => x.id).join('');

describe('nextQuestion', () => {
  it('前の設問の続きになる（大問は同じ、小問が数字なら +1）', () => {
    const n = nextQuestion(q('a', '3'));
    expect(n.major).toBe('2');
    expect(n.sub).toBe('4');
    expect(n.id).not.toBe('a');
  });
  it('小問が数字でなければ空、最初の設問は大問1', () => {
    expect(nextQuestion(q('a', 'ア')).sub).toBe('');
    expect(nextQuestion().major).toBe('1');
  });
});

describe('moveQuestion', () => {
  const qs = ['a', 'b', 'c', 'd'].map((id) => q(id));
  it('下へ移す（対象の下側 / 上側）', () => {
    expect(ids(moveQuestion(qs, 'a', 'c', true))).toBe('bcad');
    expect(ids(moveQuestion(qs, 'a', 'c', false))).toBe('bacd');
  });
  it('上へ移す', () => {
    expect(ids(moveQuestion(qs, 'd', 'a', false))).toBe('dabc');
    expect(ids(moveQuestion(qs, 'd', 'b', true))).toBe('abdc');
  });
  it('位置が変わらないときは同じ配列を返す', () => {
    expect(moveQuestion(qs, 'b', 'a', true)).toBe(qs);
    expect(moveQuestion(qs, 'b', 'c', false)).toBe(qs);
    expect(moveQuestion(qs, 'x', 'a', true)).toBe(qs);
  });
  it('元の配列は書き換えない', () => {
    moveQuestion(qs, 'a', 'd', true);
    expect(ids(qs)).toBe('abcd');
  });
});

describe('emptyState', () => {
  it('毎回新しいオブジェクト', () => {
    expect(emptyState().questions).toEqual([]);
    expect(emptyState().meta).not.toBe(emptyState().meta);
  });
});
