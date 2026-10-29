import { describe, expect, it } from 'vitest';
import { buildLayout, paperCols, totalPoints } from './layout';
import { sampleState } from './sample';
import { buildWorkbook } from './excel';

const overlaps = (a: { r: number; c: number; rs: number; cs: number }, b: typeof a) =>
  a.r < b.r + b.rs && b.r < a.r + a.rs && a.c < b.c + b.cs && b.c < a.c + a.cs;

describe('縦書きレイアウト', () => {
  const s = sampleState('vertical');
  const l = buildLayout(s.meta, s.questions);

  it('国語サンプルは満点100・縦書き・B4横', () => {
    expect(totalPoints(s.questions)).toBe(100);
    expect(s.meta.writing).toBe('vertical');
    expect(s.meta.orientation).toBe('landscape');
    expect(l.fits).toBe(true);
  });

  it('文字の進む方向が用紙の高さ、行の積み重なりが幅になる', () => {
    expect(l.cols).toBe(paperCols('B4', 'landscape', 'vertical'));
    for (const p of l.pages) {
      expect(p.rowHeights).toHaveLength(l.cols);
      expect(p.heightMm).toBeLessThanOrEqual(l.usableMm);
      expect(p.colWidths.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(344);
    }
  });

  it('全ページで列の構成が同じ（Excel の列幅を共有するため）', () => {
    for (const p of l.pages) expect(p.colWidths).toEqual(l.pages[0].colWidths);
  });

  it('セルが範囲内で重ならず、すべて縦書き', () => {
    for (const p of l.pages) {
      for (const c of p.cells) {
        // 問題番号・得点だけ横書き、それ以外は縦書き
        expect(c.vertical).toBe(!c.hText);
        expect(c.c).toBeGreaterThanOrEqual(0);
        expect(c.c + c.cs).toBeLessThanOrEqual(p.colWidths.length);
        expect(c.r + c.rs).toBeLessThanOrEqual(p.rowHeights.length);
      }
      for (let i = 0; i < p.cells.length; i++)
        for (let j = i + 1; j < p.cells.length; j++) expect(overlaps(p.cells[i], p.cells[j])).toBe(false);
    }
  });

  it('タイトルが右端の列にあり、大問1は左隣から始まる', () => {
    const p = l.pages[0];
    const title = p.cells.find((c) => c.kind === 'title')!;
    const maxRight = Math.max(...p.cells.map((c) => c.c + c.cs));
    expect(title.c + title.cs).toBe(maxRight);
    const group1 = p.cells.find((c) => c.kind === 'group')!;
    expect(group1.c + group1.cs).toBeLessThan(title.c);
  });

  it('問題番号・配点・得点は横書きのセルで、小問番号は欄の手前に独立している', () => {
    const cells = l.pages[0].cells;
    const boxes = cells.filter((c) => c.kind === 'box');
    const labels = cells.filter((c) => c.kind === 'label');
    // 設問の数だけ小問番号のセルがある
    expect(l.pages).toHaveLength(1);
    expect(labels).toHaveLength(s.questions.length);
    for (const c of cells.filter((x) => ['label', 'pts'].includes(x.kind))) expect(c.vertical).toBe(false);
    for (const c of boxes) expect(c.vertical).toBe(true);
    expect(cells.find((c) => c.text === '得点')!.vertical).toBe(false);
    expect(cells.find((c) => c.text.startsWith('／'))!.vertical).toBe(false);
    expect(cells.find((c) => c.kind === 'title')!.vertical).toBe(true);
    expect(cells.find((c) => c.kind === 'group')!.vertical).toBe(true); // 大問は縦書きのまま
    // 小問番号の下に線は入れない
    expect(labels.every((x) => !x.border.b)).toBe(true);
    // ラベルは欄の物理的に上、同じ列にある
    const b = boxes[0];
    const lb = labels.find((x) => x.c === b.c && x.cs === b.cs)!;
    expect(lb.r + lb.rs).toBe(b.r);
  });

  it('Excel は縦書き（textRotation）で出力される', () => {
    const wb = buildWorkbook(s.meta, s.questions);
    const ws = wb.getWorksheet('解答用紙')!;
    let found = false;
    ws.eachRow((row) => row.eachCell((c) => {
      if (c.alignment?.textRotation === 'vertical') found = true;
    }));
    expect(found).toBe(true);
    expect(ws.pageSetup.orientation).toBe('landscape');
    expect(ws.pageSetup.paperSize).toBe(12);
  });

  it('縦書きで2枚以上のとき、2枚目は右端の列が詰まり、幅の合計は全ページ同じ', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...s.questions[0],
      id: `m${i}`,
      major: String(Math.floor(i / 4) + 1),
      sub: String((i % 4) + 1),
      answer: 'あ'.repeat(60),
      type: 'essay' as const,
    }));
    const l2 = buildLayout(s.meta, many);
    expect(l2.pages.length).toBeGreaterThan(1);
    const sum = (p: (typeof l2.pages)[number]) => Math.round(p.colWidths.reduce((a, b) => a + b, 0) * 100) / 100;
    for (const p of l2.pages) expect(sum(p)).toBe(sum(l2.pages[0]));
    expect(l2.pages[0].cells.some((c) => c.kind === 'title')).toBe(true);
    expect(l2.pages[1].cells.some((c) => c.kind === 'title')).toBe(false);

    // Excel: 列幅が違うページを結合セルで重ねても作れる
    const wb = buildWorkbook(s.meta, many);
    const ws = wb.getWorksheet('解答用紙')!;
    expect(ws.rowCount).toBe(l2.cols * l2.pages.length);
  });
});
