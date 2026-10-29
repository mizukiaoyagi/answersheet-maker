import { describe, expect, it } from 'vitest';
import { buildLayout, gridCount, totalPoints } from './layout';
import { sampleState, type SampleKind } from './sample';

const kinds: SampleKind[] = ['one', 'two', 'vertical'];

describe('サンプル', () => {
  for (const kind of kinds) {
    describe(kind, () => {
      const s = sampleState(kind);

      it('満点100点で、配点の合計と一致する', () => {
        expect(s.meta.fullScore).toBe(100);
        expect(totalPoints(s.questions)).toBe(100);
      });

      it('大問ごとに小問番号が 1 から順に並ぶ', () => {
        const subs = new Map<string, string[]>();
        for (const q of s.questions) subs.set(q.major, [...(subs.get(q.major) ?? []), q.sub]);
        for (const [major, list] of subs) {
          expect(list, `大問${major}`).toEqual(list.map((_, i) => String(i + 1)));
        }
      });

      it('模範解答の入っていない設問はなく、マス目は模範解答が収まる', () => {
        for (const q of s.questions) {
          expect(q.answer.length).toBeGreaterThan(0);
          if (gridCount(q) > 0) expect([...q.answer].length).toBeLessThanOrEqual(gridCount(q));
        }
      });

      it('用紙に収まる', () => {
        expect(buildLayout(s.meta, s.questions).fits).toBe(true);
      });
    });
  }

  it('ページ数は、1枚・2枚・1枚（縦書き）', () => {
    const pages = (k: SampleKind) => {
      const s = sampleState(k);
      return buildLayout(s.meta, s.questions).pages.length;
    };
    expect(pages('one')).toBe(1);
    expect(pages('two')).toBe(2);
    expect(pages('vertical')).toBe(1);
  });

  it('記号・語句・記述が混ざり、マス目の設問も入っている', () => {
    for (const kind of kinds) {
      const s = sampleState(kind);
      const types = new Set(s.questions.map((q) => q.type));
      expect(types, kind).toEqual(new Set(['symbol', 'word', 'essay']));
      expect(s.questions.some((q) => gridCount(q) > 0), kind).toBe(true);
    }
  });

  it('縦書きのサンプルは B4 横', () => {
    const s = sampleState('vertical');
    expect([s.meta.writing, s.meta.paper, s.meta.orientation]).toEqual(['vertical', 'B4', 'landscape']);
  });
});
