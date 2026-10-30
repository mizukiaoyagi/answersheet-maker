import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildWorkbook } from './excel';
import { buildLayout, cellRuns, type LCell } from './layout';
import { DEFAULT_META, type AnswerType, type Question, type TestMeta } from './types';

/** 再現できる乱数 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const overlaps = (a: LCell, b: LCell) =>
  a.r < b.r + b.rs && b.r < a.r + a.rs && a.c < b.c + b.cs && b.c < a.c + a.cs;

function randomCase(seed: number): { meta: TestMeta; questions: Question[] } {
  const rand = rng(seed);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const meta: TestMeta = {
    ...DEFAULT_META,
    title: pick(['', '理科 小テスト', 'あ'.repeat(40)]),
    paper: pick(['A4', 'B4'] as const),
    orientation: pick(['portrait', 'landscape'] as const),
    writing: pick(['horizontal', 'vertical'] as const),
    hasClass: rand() < 0.7,
    hasNumber: rand() < 0.7,
    hasName: rand() < 0.7,
    fullScore: Math.floor(rand() * 200),
  };
  const n = Math.floor(rand() * 40);
  const questions: Question[] = Array.from({ length: n }, (_, i) => {
    const len = pick([0, 1, 2, 3, 8, 15, 16, 40, 120]);
    const grid = rand() < 0.3 ? true : undefined;
    const size = rand() < 0.3 ? { w: pick([1, 2, 5, 10, 30, 100]), rows: pick([1, 2, 3, 20]) } : undefined;
    return {
      id: `q${i}`,
      major: pick(['1', '1', '2', '3', '', '大']),
      sub: pick(['', '1', '2', '(3)', 'ア']),
      type: pick(['symbol', 'word', 'essay'] as AnswerType[]),
      typeManual: true,
      answer: pick(['あ', 'A', '1', 'ｱ']).repeat(len) + (rand() < 0.2 ? '\n改行' : ''),
      points: pick([0, 1, 2.5, 5, 10]),
      grid,
      size,
    };
  });
  return { meta, questions };
}

describe('ランダムな入力でレイアウトが壊れない', () => {
  for (let seed = 1; seed <= 120; seed++) {
    it(`seed ${seed}`, async () => {
      const { meta, questions } = randomCase(seed);
      const l = buildLayout(meta, questions);

      expect(l.pages.length).toBeGreaterThanOrEqual(1);
      // 設問がすべてどこかのページに載っている（小問番号のセルの数 = 設問数）
      const labels = l.pages.reduce((n, p) => n + p.cells.filter((c) => c.kind === 'label').length, 0);
      expect(labels).toBe(questions.length);
      // マス目にしない設問のマスはない
      const grids = l.pages.reduce((n, p) => n + p.cells.filter((c) => c.kind === 'grid').length, 0);
      if (!questions.some((q) => q.grid)) expect(grids).toBe(0);

      for (const p of l.pages) {
        expect(p.colWidths.every((w) => w > 0)).toBe(true);
        expect(p.rowHeights.every((h) => h > 0)).toBe(true);
        for (const c of p.cells) {
          expect(c.c).toBeGreaterThanOrEqual(0);
          expect(c.r).toBeGreaterThanOrEqual(0);
          expect(c.c + c.cs).toBeLessThanOrEqual(p.colWidths.length);
          expect(c.r + c.rs).toBeLessThanOrEqual(p.rowHeights.length);
          expect(() => cellRuns(c, 'model')).not.toThrow();
        }
        // セルが重ならない（マス目が多い場合は少数のページだけ全組み合わせを確認）
        if (p.cells.length < 400)
          for (let i = 0; i < p.cells.length; i++)
            for (let j = i + 1; j < p.cells.length; j++)
              if (overlaps(p.cells[i], p.cells[j])) throw new Error(`overlap ${JSON.stringify([p.cells[i], p.cells[j]])}`);
        // ページが用紙の内側に収まる（1行が1ページより高い極端なケースは fits=false になる）
        if (l.fits) expect(p.heightMm).toBeLessThanOrEqual(l.usableMm + 0.01);
      }

      // Excel が作れて、読み戻せる
      const wb = buildWorkbook(meta, questions);
      const buf = await wb.xlsx.writeBuffer();
      const back = new ExcelJS.Workbook();
      await back.xlsx.load(buf as ArrayBuffer);
      expect(back.worksheets.map((w) => w.name)).toEqual(['解答用紙', '模範解答']);
    });
  }
});
