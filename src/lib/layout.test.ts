import { describe, expect, it } from 'vitest';
import { COEF } from './constants';
import {
  boxSize,
  buildLayout,
  cellRuns,
  countChars,
  isNumericAnswer,
  maxCellsPerRow,
  paperCols,
  suggestType,
  totalPoints,
} from './layout';
import { sampleState } from './sample';
import { DEFAULT_META, type Question } from './types';

const q = (major: string, sub: string, answer: string, points = 5): Question => ({
  id: `${major}-${sub}`,
  major,
  sub,
  answer,
  points,
  type: suggestType(answer),
  typeManual: false,
});

describe('countChars', () => {
  it('全角=1、半角=0.5', () => {
    expect(countChars('ア')).toBe(1);
    expect(countChars('abc')).toBe(1.5);
    expect(countChars('100Pa')).toBe(2.5);
    expect(countChars('ｱｲ')).toBe(1);
    expect(countChars('あ\nい')).toBe(2);
  });
});

describe('suggestType', () => {
  it('文字数から提案する', () => {
    expect(suggestType('ア')).toBe('symbol');
    expect(suggestType('イウ')).toBe('symbol');
    expect(suggestType('焦点')).toBe('word'); // 漢字の語は2文字でも語句
    expect(suggestType('ア')).toBe('symbol');
    expect(suggestType('ウ,エ')).toBe('word');
    expect(suggestType('全反射')).toBe('word');
    expect(suggestType('あ'.repeat(15))).toBe('word');
    expect(suggestType('あ'.repeat(16))).toBe('essay');
  });
  it('数値の答えは語句扱い', () => {
    expect(isNumericAnswer('12')).toBe(true);
    expect(isNumericAnswer('3.14cm')).toBe(true);
    expect(isNumericAnswer('ア')).toBe(false);
    expect(suggestType('12')).toBe('word');
    expect(suggestType('1020m')).toBe('word');
  });
});

describe('boxSize', () => {
  const cols = 38;
  it('記号（択一）は幅3固定・1行', () => {
    expect(boxSize('symbol', 1, cols)).toEqual({ mainW: COEF.SYMBOL_WIDTH, rows: 1 });
    expect(COEF.SYMBOL_WIDTH).toBe(3);
  });
  it('小問番号は0.5文字分（1列）', () => {
    expect(COEF.LABEL_COLS * 2).toBe(COEF.GRID_CELL_COLS);
  });
  it('語句は1文字=2列・最小6', () => {
    expect(boxSize('word', 2, cols)).toEqual({ mainW: 6, rows: 1 });
    expect(boxSize('word', 10, cols)).toEqual({ mainW: 20, rows: 1 });
  });
  it('記述は横幅いっぱいで行数を計算（最低2行）', () => {
    const maxMain = cols;
    const perRow = maxCellsPerRow(maxMain);
    expect(boxSize('essay', 16, cols)).toEqual({ mainW: perRow * COEF.GRID_CELL_COLS, rows: 2 });
    expect(boxSize('essay', 40, cols).rows).toBe(Math.max(2, Math.ceil(40 / perRow)));
    expect(boxSize('essay', 100, cols).rows).toBe(Math.ceil(100 / perRow));
  });
});

describe('paperCols', () => {
  it('用紙幅に応じた列数', () => {
    expect(paperCols('A4', 'portrait')).toBe(36);
    expect(paperCols('B4', 'portrait')).toBe(45);
    expect(paperCols('A4', 'landscape')).toBe(53);
    expect(paperCols('A4', 'portrait', 'vertical')).toBe(53);
  });
});

describe('buildLayout', () => {
  const overlaps = (a: { r: number; c: number; rs: number; cs: number }, b: typeof a) =>
    a.r < b.r + b.rs && b.r < a.r + a.rs && a.c < b.c + b.cs && b.c < a.c + a.cs;

  it('サンプルがA4・1枚に収まり、セルが重ならず幅を超えない', () => {
    const s = sampleState();
    const l = buildLayout(s.meta, s.questions);
    expect(l.fits).toBe(true);
    expect(l.pages).toHaveLength(1);
    for (const page of l.pages) {
      const cells = page.cells;
      for (const c of cells) {
        expect(c.c).toBeGreaterThanOrEqual(0);
        expect(c.c + c.cs).toBeLessThanOrEqual(l.cols);
        expect(c.r + c.rs).toBeLessThanOrEqual(page.rowHeights.length);
      }
      for (let i = 0; i < cells.length; i++)
        for (let j = i + 1; j < cells.length; j++) expect(overlaps(cells[i], cells[j])).toBe(false);
    }
  });

  it('同じ大問の欄は隙間なく横に詰めて、入らなければ折り返す', () => {
    const qs = [q('1', '1', 'ア'), q('1', '2', 'イ'), q('1', '3', 'ウ')];
    const boxes = buildLayout(DEFAULT_META, qs).pages[0].cells.filter((c) => c.kind === 'box');
    expect(new Set(boxes.map((b) => b.r)).size).toBe(1);
    expect(boxes[1].c).toBe(boxes[0].c + boxes[0].cs + COEF.GAP_COLS + COEF.LABEL_COLS);

    const many = Array.from({ length: 12 }, (_, i) => q('1', String(i + 1), 'ア'));
    const boxes2 = buildLayout(DEFAULT_META, many).pages[0].cells.filter((c) => c.kind === 'box');
    expect(new Set(boxes2.map((b) => b.r)).size).toBeGreaterThan(1);
  });

  it('上の欄の真下にある欄は上罫線を省く', () => {
    const many = Array.from({ length: 12 }, (_, i) => q('1', String(i + 1), 'ア'));
    const boxes = buildLayout(DEFAULT_META, many).pages[0].cells.filter((c) => c.kind === 'box');
    const firstRow = Math.min(...boxes.map((b) => b.r));
    expect(boxes.filter((b) => b.r === firstRow).every((b) => b.border.t)).toBe(true);
    const second = boxes.find((b) => b.r > firstRow)!;
    expect(second.border.t).toBe(false);
  });

  it('大問が変わると改行し、記述は単独の行になる', () => {
    const qs = [q('1', '1', 'ア'), q('2', '1', 'イ'), q('2', '2', 'あ'.repeat(30)), q('2', '3', 'ウ')];
    const l = buildLayout(DEFAULT_META, qs);
    const cells = l.pages[0].cells;
    expect(cells.filter((c) => c.kind === 'group')).toHaveLength(2);
    const essay = cells.find((c) => c.kind === 'box' && c.answer.length === 30)!;
    const perRow = maxCellsPerRow(l.cols - COEF.LABEL_COLS);
    expect(essay.cs).toBe(perRow * COEF.GRID_CELL_COLS);
    expect(essay.rs).toBeGreaterThanOrEqual(2);
    expect(cells.filter((c) => c.kind === 'box' && c.r === essay.r)).toHaveLength(1);
  });

  it('入らないと次のページへ続く。タイトルと組番号氏名は1枚目だけ', () => {
    const many = Array.from({ length: 12 }, (_, i) => q(String(i + 1), '1', 'あ'.repeat(40)));
    const l = buildLayout(DEFAULT_META, many);
    expect(l.pages.length).toBeGreaterThan(1);
    expect(l.fits).toBe(true);
    const has = (p: (typeof l.pages)[number], text: string) => p.cells.some((c) => c.text === text);
    l.pages.forEach((p, i) => {
      expect(p.heightMm).toBeLessThanOrEqual(l.usableMm);
      expect(p.cells.some((c) => c.kind === 'title')).toBe(i === 0);
      expect(has(p, '氏名')).toBe(i === 0);
      expect(has(p, '組')).toBe(i === 0);
      expect(has(p, '得点')).toBe(i === 0);
      // 大問の見出しだけで終わるページはない
      expect(p.cells.some((c) => c.kind === 'box')).toBe(true);
    });
    const total = l.pages.reduce((n, p) => n + p.cells.filter((c) => c.kind === 'box').length, 0);
    expect(total).toBe(12);
  });

  it('1枚だけのときはタイトルも組番号氏名も付く', () => {
    const l = buildLayout(DEFAULT_META, [q('1', '1', 'ア')]);
    expect(l.pages).toHaveLength(1);
    expect(l.pages[0].cells.some((c) => c.kind === 'title')).toBe(true);
    expect(l.pages[0].cells.some((c) => c.text === '氏名')).toBe(true);
  });

  it('同じ大問が次のページへ続くときも、見出しは大問の名前のまま', () => {
    const many = Array.from({ length: 20 }, (_, i) => q('1', String(i + 1), 'あ'.repeat(40)));
    const l = buildLayout(DEFAULT_META, many);
    expect(l.pages.length).toBeGreaterThan(1);
    expect(l.pages[1].cells.find((c) => c.kind === 'group')!.text).toBe('大問1');
  });

  it('横向きは列数が増え、ページの高さが小さくなる', () => {
    const s = sampleState();
    const p = buildLayout(s.meta, s.questions);
    const ls = buildLayout({ ...s.meta, orientation: 'landscape' }, s.questions);
    expect(ls.cols).toBeGreaterThan(p.cols);
    expect(ls.usableMm).toBeLessThan(p.usableMm);
    expect(ls.pages.length).toBeGreaterThanOrEqual(1);
  });
});

describe('見出しと得点欄', () => {
  const cellsOf = (meta = DEFAULT_META) => buildLayout(meta, [q('1', '1', 'ア')]).pages[0].cells;
  const rightEdge = (cells: ReturnType<typeof cellsOf>, pred: (c: (typeof cells)[number]) => boolean) =>
    Math.max(...cells.filter(pred).map((c) => c.c + c.cs));

  it('タイトル → 組番号氏名 → 得点 の順で、右端がそろい、すぐ近くに並ぶ', () => {
    const cells = cellsOf();
    const title = cells.find((c) => c.kind === 'title')!;
    const name = cells.find((c) => c.text === '氏名')!;
    const score = cells.find((c) => c.text === '得点')!;
    expect(title.r).toBeLessThan(name.r);
    expect(name.r).toBeLessThan(score.r);
    // 氏名の枠（氏名ラベルの右隣）と得点の欄の右端がそろう
    expect(rightEdge(cells, (c) => c.r === name.r)).toBe(rightEdge(cells, (c) => c.r === score.r));
    expect(rightEdge(cells, (c) => c.r === name.r)).toBe(title.c + title.cs);
  });

  it('解答欄に配点は書かない（解答用紙も模範解答も）', () => {
    const cells = cellsOf();
    expect(cells.some((c) => (c.kind as string) === 'pts')).toBe(false);
    for (const mode of ['sheet', 'model'] as const)
      for (const c of cells) for (const r of cellRuns(c, mode)) expect(r.text).not.toMatch(/\d点/);
  });

  it('小問番号は解答欄と線で区切られる', () => {
    const label = cellsOf().find((c) => c.kind === 'label')!;
    expect(label.border.r).toBe(true);
  });

});

describe('totalPoints', () => {
  it('合計（小数誤差なし）', () => {
    expect(totalPoints([q('1', '1', 'a', 0.1), q('1', '2', 'b', 0.2)])).toBe(0.3);
    expect(totalPoints(sampleState().questions)).toBe(100);
  });
});
