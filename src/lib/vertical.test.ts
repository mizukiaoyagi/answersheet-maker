import { describe, expect, it } from 'vitest';
import { boxLabel, buildLayout, groupLabel, paperCols, toKanjiNumber, totalPoints } from './layout';
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

  it('問題番号・得点は横書きのセルで、小問番号は欄の手前に独立している', () => {
    const cells = l.pages[0].cells;
    const boxes = cells.filter((c) => c.kind === 'box');
    const labels = cells.filter((c) => c.kind === 'label');
    // 設問の数だけ小問番号のセルがある
    expect(l.pages).toHaveLength(1);
    expect(labels).toHaveLength(s.questions.length);
    for (const c of labels) expect(c.vertical).toBe(false);
    for (const c of boxes) expect(c.vertical).toBe(true);
    expect(cells.find((c) => c.text === '得点')!.vertical).toBe(false);
    expect(cells.find((c) => c.text.startsWith('／'))!.vertical).toBe(false);
    expect(cells.find((c) => c.kind === 'title')!.vertical).toBe(true);
    expect(cells.find((c) => c.kind === 'group')!.vertical).toBe(true); // 大問は縦書きのまま
    // 小問番号と解答欄は線で区切る（縦書きでは小問番号の下）
    expect(labels.every((x) => x.border.b)).toBe(true);
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
      size: undefined, // 大きさを指定すると、長い答えでも大きくならない
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

describe('国語（縦書き）の大問番号は漢数字', () => {
  it('漢数字に直す（0〜99）', () => {
    expect([1, 2, 9, 10, 11, 20, 21, 99].map(toKanjiNumber)).toEqual(['一', '二', '九', '十', '十一', '二十', '二十一', '九十九']);
    expect(toKanjiNumber(100)).toBe('100');
    expect(toKanjiNumber(-1)).toBe('-1');
  });

  it('見出しとラベル: 縦書きは漢数字、横書きは数字のまま', () => {
    expect(groupLabel('1', true)).toBe('大問一');
    expect(groupLabel('１２', true)).toBe('大問十二');
    expect(groupLabel('1')).toBe('大問1');
    expect(groupLabel('ア', true)).toBe('ア');
    expect(boxLabel({ major: '3', sub: '' }, true)).toBe('三');
    expect(boxLabel({ major: '3', sub: '' })).toBe('3');
    expect(boxLabel({ major: '3', sub: '2' }, true)).toBe('(2)'); // 小問は数字のまま
  });

  it('国語サンプルの見出しは「大問一」〜、横書きサンプルは「大問1」〜', () => {
    const v = sampleState('vertical');
    const vt = buildLayout(v.meta, v.questions).pages[0].cells.filter((c) => c.kind === 'group').map((c) => c.text);
    expect(vt).toEqual(['大問一', '大問二', '大問三', '大問四']);
    const h = sampleState('one');
    const ht = buildLayout(h.meta, h.questions).pages[0].cells.filter((c) => c.kind === 'group').map((c) => c.text);
    expect(ht).toEqual(['大問1', '大問2', '大問3', '大問4']);
  });
});
