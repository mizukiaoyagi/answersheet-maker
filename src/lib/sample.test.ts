import { describe, expect, it } from 'vitest';
import { PAPER_SIZES } from './constants';
import { buildLayout, totalPoints } from './layout';
import { SAMPLE_LIST, sampleState, type SampleKind } from './sample';

const kinds: SampleKind[] = ['math', 'japanese', 'social', 'kanji'];

describe('サンプル', () => {
  it('項目名は「用紙+教科名（縦書き or 横書き）」、タイトルは「教科名+中間考査・期末考査・小テスト」', () => {
    expect(SAMPLE_LIST.map((s) => s.label)).toEqual([
      'A4数学（横書き）',
      'B4国語（縦書き）',
      'B4社会（横書き）',
      'B5漢字（縦書き）',
    ]);
    expect(kinds.map((k) => sampleState(k).meta.title)).toEqual([
      '数学中間考査',
      '国語中間考査',
      '社会期末考査',
      '漢字小テスト',
    ]);
    // 項目名は用紙の名前で始まり、書き方を含む。タイトルは、項目名の教科名で始まる
    for (const { kind, label } of SAMPLE_LIST) {
      const m = sampleState(kind).meta;
      const subject = label.replace(/^[AB]\d/, '').split('（')[0];
      expect(label.startsWith(m.paper), kind).toBe(true);
      expect(label, kind).toContain(m.writing === 'vertical' ? '（縦書き）' : '（横書き）');
      expect(m.title.startsWith(subject), kind).toBe(true);
      expect(m.title, kind).toMatch(/(中間考査|期末考査|小テスト)$/);
    }
  });

  it('用紙は A4・B4・B5 だけで、すべて使われている', () => {
    const papers = new Set(kinds.map((k) => sampleState(k).meta.paper));
    expect([...papers].sort()).toEqual([...PAPER_SIZES].sort());
  });

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

      it('模範解答の入っていない設問はない', () => {
        for (const q of s.questions) expect(q.answer.length).toBeGreaterThan(0);
      });

      it('用紙に収まり、セルが用紙の幅を超えない', () => {
        const l = buildLayout(s.meta, s.questions);
        expect(l.fits).toBe(true);
        for (const p of l.pages)
          for (const c of p.cells) {
            expect(c.c + c.cs).toBeLessThanOrEqual(p.colWidths.length);
            expect(c.r + c.rs).toBeLessThanOrEqual(p.rowHeights.length);
          }
      });
    });
  }

  it('漢字の欄の大きさ: B4国語は4字、B5漢字は6字', () => {
    const w = (k: SampleKind, major: string) =>
      new Set(sampleState(k).questions.filter((q) => q.major === major).map((q) => q.size?.w));
    expect(w('japanese', '1')).toEqual(new Set([4]));
    expect(w('kanji', '')).toEqual(new Set([6]));
  });

  it('漢字の小テストには大問番号がなく、(1)〜(20)だけが並ぶ', () => {
    const s = sampleState('kanji');
    expect(s.questions.every((q) => q.major === '')).toBe(true);
    const cells = buildLayout(s.meta, s.questions).pages.flatMap((p) => p.cells);
    expect(cells.filter((c) => c.kind === 'group')).toHaveLength(0);
    const labels = cells.filter((c) => c.kind === 'label').map((c) => c.label);
    expect(labels).toEqual(Array.from({ length: 20 }, (_, i) => `(${i + 1})`));
  });

  it('用紙・向き・書き方', () => {
    const layout = (k: SampleKind) => {
      const m = sampleState(k).meta;
      return [m.paper, m.orientation, m.writing];
    };
    expect(layout('math')).toEqual(['A4', 'portrait', 'horizontal']);
    expect(layout('japanese')).toEqual(['B4', 'landscape', 'vertical']);
    expect(layout('social')).toEqual(['B4', 'portrait', 'horizontal']);
    expect(layout('kanji')).toEqual(['B5', 'landscape', 'vertical']);
    // 漢字の小テストは、縦書きで紙は横向き
  });

  it('ページ数は、数学が2枚、ほかは1枚', () => {
    const pages = (k: SampleKind) => {
      const s = sampleState(k);
      return buildLayout(s.meta, s.questions).pages.length;
    };
    expect(pages('math')).toBe(2);
    for (const k of ['japanese', 'social', 'kanji'] as const) expect(pages(k), k).toBe(1);
  });

  it('漢字のサンプル以外は、記号・語句・記述が混ざり、マス目の設問も入っている', () => {
    for (const kind of kinds.filter((k) => k !== 'kanji')) {
      const s = sampleState(kind);
      const types = new Set(s.questions.map((q) => q.type));
      for (const t of ['symbol', 'word', 'essay'] as const) expect(types.has(t), `${kind} ${t}`).toBe(true);
      expect(s.questions.some((q) => q.grid), kind).toBe(true);
    }
  });

  it('大きさをそろえたい設問（漢字・計算・方程式）は、答えの長さが違っても欄が同じ大きさ', () => {
    for (const [kind, major] of [
      ['japanese', '1'],
      ['kanji', ''],
      ['math', '1'],
      ['math', '2'],
    ] as const) {
      const s = sampleState(kind);
      const qs = s.questions.filter((q) => q.major === major);
      expect(qs.every((q) => q.size), `${kind} 大問${major}`).toBe(true);
      expect(new Set(qs.map((q) => JSON.stringify(q.size))).size).toBe(1);
      expect(new Set(qs.map((q) => q.answer.length)).size).toBeGreaterThan(1);
      // 答えは欄に収まる
      expect(qs.every((q) => q.answer.length <= (q.size?.w ?? 0))).toBe(true);
      const cells = buildLayout(s.meta, s.questions).pages.flatMap((p) => p.cells).filter((c) => c.kind === 'box' && c.answer);
      const mine = cells.filter((c) => qs.some((q) => q.answer === c.answer));
      expect(new Set(mine.map((c) => `${c.rs}x${c.cs}`)).size, `${kind} 大問${major}`).toBe(1);
    }
  });

  describe('数学の作図の枠', () => {
    const s = sampleState('math');
    const l = buildLayout(s.meta, s.questions);

    it('いちばん最後の設問で、大きな枠（他の欄より十分に大きい）', () => {
      const last = s.questions.at(-1)!;
      expect(last.major).toBe('7');
      expect(last.size).toEqual({ w: 15, rows: expect.any(Number) });
      expect(last.size!.rows).toBeGreaterThanOrEqual(10);
      // 最後のページの最後の欄
      const boxes = l.pages.at(-1)!.cells.filter((c) => c.kind === 'box' && c.answer);
      const frame = boxes.at(-1)!;
      expect(frame.answer).toBe(last.answer);
      expect(frame.rs).toBe(last.size!.rows);
      for (const b of boxes.slice(0, -1)) expect(frame.rs * frame.cs).toBeGreaterThan(b.rs * b.cs);
    });

    it('枠は最後のページの下の余白まで届く', () => {
      const p = l.pages.at(-1)!;
      expect(l.usableMm - p.heightMm).toBeLessThan(0.01);
    });
  });
});
