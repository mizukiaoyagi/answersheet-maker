import { describe, expect, it } from 'vitest';
import { COEF } from './constants';
import { buildLayout, gridCells, maxCellsPerRow, plainLength, sizedBox, type LCell } from './layout';
import { sampleState } from './sample';
import { DEFAULT_META, type AnswerType, type Question } from './types';

const q = (answer: string, grid?: number, type: AnswerType = 'word', sub = '1'): Question => ({
  id: `g${sub}`,
  major: '1',
  sub,
  answer,
  points: 5,
  type,
  typeManual: false,
  // マス目にするか（数は、模範解答の字数と同じ）
  grid: grid ? true : undefined,
});

const overlaps = (a: { r: number; c: number; rs: number; cs: number }, b: typeof a) =>
  a.r < b.r + b.rs && b.r < a.r + a.rs && a.c < b.c + b.cs && b.c < a.c + a.cs;

/** 解答欄（通常の欄 or マス目全体）の外形 */
function answerRect(cells: LCell[]) {
  const parts = cells.filter((c) => c.kind === 'box' || c.kind === 'grid');
  const r = Math.min(...parts.map((c) => c.r));
  const c0 = Math.min(...parts.map((c) => c.c));
  return {
    r,
    c: c0,
    rs: Math.max(...parts.map((c) => c.r + c.rs)) - r,
    cs: Math.max(...parts.map((c) => c.c + c.cs)) - c0,
  };
}

describe('マス目', () => {
  it('マス目に入る文字数は、改行を除いた字数', () => {
    expect(plainLength('あい\nう')).toBe(3);
    expect(plainLength('')).toBe(0);
  });

  it('マスの割り付け。割り切れない分は行の最後のマスを広げる', () => {
    expect(gridCells(10, 1, 20)).toEqual({ perRow: 10, widths: Array(10).fill(2) });
    expect(gridCells(2, 1, 6)).toEqual({ perRow: 2, widths: [3, 3] });
    expect(gridCells(5, 1, 8)).toEqual({ perRow: 5, widths: [1, 1, 1, 1, 4] });
    // 複数行は1文字ぶん(2列)のマスを端まで並べる。最後の行の余りは空のマス
    expect(gridCells(40, 3, 34)).toEqual({ perRow: 17, widths: Array(17).fill(2) });
  });

  for (const [name, type, answer, n] of [
    ['記号', 'symbol', 'ア', 1],
    ['語句', 'word', 'ニュートン', 5],
    ['語句（長め）', 'word', 'あいうえおかきくけこ', 10],
    ['記述', 'essay', 'あ'.repeat(40), 40],
  ] as const) {
    it(`${name}: マス目があってもなくても解答欄の大きさ・位置が同じ`, () => {
      const without = buildLayout(DEFAULT_META, [q(answer, undefined, type)]).pages[0].cells;
      const withGrid = buildLayout(DEFAULT_META, [q(answer, n, type)]).pages[0].cells;
      expect(answerRect(withGrid)).toEqual(answerRect(without));
      // 小問番号のセルも同じ位置
      const pick = (cells: LCell[], k: string) => cells.filter((c) => c.kind === k).map((c) => [c.r, c.c, c.rs, c.cs]);
      expect(pick(withGrid, 'label')).toEqual(pick(without, 'label'));
    });
  }

  it('指定した字数ちょうどのマスができる（47字なら47マス）', () => {
    for (const [n, type] of [[47, 'essay'], [47, 'word'], [10, 'word'], [1, 'symbol'], [2, 'symbol'], [3, 'symbol'], [5, 'essay']] as const) {
      const cells = buildLayout(DEFAULT_META, [q('あ'.repeat(n), n, type)]).pages[0].cells;
      expect(cells.filter((c) => c.kind === 'grid'), `${type} ${n}`).toHaveLength(n);
    }
  });

  it('マスと空白で欄全体を隙間なく埋め、重ならない（マスの足りない所は空白）', () => {
    const cells = buildLayout(DEFAULT_META, [q('あ'.repeat(47), 47, 'essay')]).pages[0].cells;
    const parts = cells.filter((c) => c.kind === 'grid' || c.kind === 'box');
    const rect = answerRect(cells);
    const area = parts.reduce((s, c) => s + c.cs * c.rs, 0);
    expect(area).toBe(rect.cs * rect.rs);
    // 空白の部分には模範解答も入らない
    expect(cells.filter((c) => c.kind === 'box').every((c) => c.answer === '')).toBe(true);
    for (let i = 0; i < cells.length; i++)
      for (let j = i + 1; j < cells.length; j++) expect(overlaps(cells[i], cells[j])).toBe(false);
  });

  it('模範解答は1文字ずつ左上から順にマスに入り、余りは空のマス', () => {
    const cells = buildLayout(DEFAULT_META, [{ ...q('ニュートン', 1, 'word'), size: { w: 4, rows: 2 } }]).pages[0].cells;
    const grid = cells.filter((c) => c.kind === 'grid').sort((a, b) => a.r - b.r || a.c - b.c);
    expect(grid.map((c) => c.answer).join('')).toBe('ニュートン');
    expect(grid).toHaveLength(8);
    expect(grid.slice(5).every((c) => c.answer === '')).toBe(true);
  });

  it('マス目の罫線: 隣と重ならず、欄の外周は全部閉じる', () => {
    const cells = buildLayout(DEFAULT_META, [q('あ'.repeat(40), 40, 'essay')]).pages[0].cells;
    const grid = cells.filter((c) => c.kind === 'grid');
    const rect = answerRect(cells);
    for (const c of grid) {
      expect(c.border.b).toBe(true);
      expect(c.border.r).toBe(true);
      expect(c.border.l).toBe(c.c === rect.c);
      // 最上段だけ上罫線（先頭の行なので付く）
      expect(c.border.t).toBe(c.r === rect.r);
    }
    // 同じ行の隣り合うマスは互いの境目が連続している
    const row0 = grid.filter((c) => c.r === rect.r).sort((a, b) => a.c - b.c);
    for (let i = 1; i < row0.length; i++) expect(row0[i].c).toBe(row0[i - 1].c + row0[i - 1].cs);
  });

  it('縦書きでも同じ大きさで、マスは縦書きの1文字、番号は横書き', () => {
    const meta = { ...DEFAULT_META, writing: 'vertical' as const, orientation: 'landscape' as const, paper: 'B4' as const };
    const without = buildLayout(meta, [q('あいうえお', undefined, 'word')]).pages[0].cells;
    const withGrid = buildLayout(meta, [q('あいうえお', 5, 'word')]).pages[0].cells;
    expect(answerRect(withGrid)).toEqual(answerRect(without));
    const grid = withGrid.filter((c) => c.kind === 'grid');
    expect(grid.every((c) => c.vertical)).toBe(true);
    expect(withGrid.find((c) => c.kind === 'label')!.vertical).toBe(false);
  });

  it('サンプルのマス目は、模範解答の字数ちょうどのマスになる', () => {
    for (const kind of ['math', 'japanese'] as const) {
      const s = sampleState(kind);
      const l = buildLayout(s.meta, s.questions);
      const want = s.questions.filter((y) => y.grid && !y.size).reduce((n, y) => n + plainLength(y.answer), 0);
      expect(l.pages.reduce((n, p) => n + p.cells.filter((c) => c.kind === 'grid').length, 0), kind).toBe(want);
    }
    expect(COEF.GRID_CELL_COLS * COEF.COL_MM).toBe(COEF.ROW_MM); // 1文字ぶん = 正方形
  });
});

describe('大きさの指定', () => {
  const sized = (answer: string, w: number, rows: number, grid = false, sub = '1'): Question => ({
    ...q(answer, grid ? 1 : undefined, 'word', sub),
    size: { w, rows },
  });
  const rectOf = (cells: LCell[]) => {
    const r = answerRect(cells);
    return [r.rs, r.cs];
  };

  it('sizedBox: 字数×行数。幅は欄に入る分まで', () => {
    expect(sizedBox({ w: 5, rows: 1 }, 38, 1)).toEqual({ mainW: 10, rows: 1, perRow: 5 });
    expect(sizedBox({ w: 5, rows: 3 }, 38, 1)).toEqual({ mainW: 10, rows: 3, perRow: 5 });
    expect(sizedBox({ w: 100, rows: 2 }, 31, 1)).toEqual({ mainW: 30, rows: 2, perRow: 15 });
    // 未指定・不正は 5字×1行
    expect(sizedBox(undefined, 38, 1)).toEqual({ mainW: 10, rows: 1, perRow: 5 });
    expect(sizedBox({ w: 0, rows: -2 }, 38, 1)).toEqual({ mainW: 10, rows: 1, perRow: 5 });
  });

  it('答えの長さが違っても、同じ指定なら同じ大きさ（種類も関係しない）', () => {
    const sizes = ['ア', '漢字', 'あいうえお', 'あ'.repeat(30)].map((a) =>
      rectOf(buildLayout(DEFAULT_META, [sized(a, 5, 1)]).pages[0].cells),
    );
    expect(new Set(sizes.map((s) => s.join())).size).toBe(1);
    expect(sizes[0]).toEqual([1, 10]);
  });

  it('マス目にすると、指定した大きさの欄をマスで埋める。大きさは変わらない', () => {
    const none = buildLayout(DEFAULT_META, [sized('漢字', 5, 2)]).pages[0].cells;
    const grid = buildLayout(DEFAULT_META, [sized('漢字', 5, 2, true)]).pages[0].cells;
    expect(none.filter((c) => c.kind === 'grid')).toHaveLength(0);
    expect(grid.filter((c) => c.kind === 'grid')).toHaveLength(10);
    expect(rectOf(grid)).toEqual(rectOf(none));
    // 答えより多いマスは空のマス
    expect(grid.filter((c) => c.kind === 'grid' && c.answer).map((c) => c.answer).join('')).toBe('漢字');
  });

  it('1行でも、マスは1文字ぶんの幅で並ぶ', () => {
    const cells = buildLayout(DEFAULT_META, [sized('あい', 5, 1, true)]).pages[0].cells;
    const grid = cells.filter((c) => c.kind === 'grid');
    expect(grid.map((c) => c.cs)).toEqual([2, 2, 2, 2, 2]);
    expect(rectOf(cells)).toEqual([1, 10]);
  });

  it('大きさを指定せずにマス目だけにすると、模範解答の字数ちょうど。答えが空なら、その種類の大きさを埋める', () => {
    const grids = (a: string) =>
      buildLayout(DEFAULT_META, [q(a, 1, 'word')]).pages[0].cells.filter((c) => c.kind === 'grid').length;
    expect(grids('ニュートン')).toBe(5);
    expect(grids('')).toBe(3); // 語句の最小幅（6列）= 3マス
  });

  it('大きさの違う欄を同じ大問に混ぜられる。大きさ未指定は、答えの長さに合わせる', () => {
    const auto = { ...q('ニュートン', undefined, 'word', '4') };
    const qs = [sized('', 5, 1, true, '1'), sized('', 2, 1, true, '2'), sized('', 10, 2, false, '3'), auto];
    const l = buildLayout(DEFAULT_META, qs);
    expect(l.fits).toBe(true);
    expect(l.pages[0].cells.filter((c) => c.kind === 'label')).toHaveLength(4);
    expect(l.pages[0].cells.filter((c) => c.kind === 'grid')).toHaveLength(7);
  });
});

describe('1行のマス数は切りの良い数', () => {
  it('5の倍数に切り下げる（入りきらない用紙は入るだけ）', () => {
    // A4縦: 入るのは16 → 15 / B4縦: 21 → 20 / 縦書きB4横: 21 → 20 / 上限は20
    expect(maxCellsPerRow(33)).toBe(15);
    expect(maxCellsPerRow(43)).toBe(20);
    expect(maxCellsPerRow(100)).toBe(20);
    expect(maxCellsPerRow(14)).toBe(5);
    expect(maxCellsPerRow(6)).toBe(3);
    expect(maxCellsPerRow(1)).toBe(1);
  });

  it('A4縦の記述・マス目は15マスずつ折り返す', () => {
    const cells = buildLayout(DEFAULT_META, [q('あ'.repeat(47), 47, 'essay')]).pages[0].cells;
    const grid = cells.filter((c) => c.kind === 'grid');
    const perRow = new Map<number, number>();
    for (const c of grid) perRow.set(c.r, (perRow.get(c.r) ?? 0) + 1);
    expect([...perRow.values()]).toEqual([15, 15, 15, 2]);
  });
});
