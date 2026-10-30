import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildWorkbook } from './excel';
import { buildLayout } from './layout';
import { sampleState } from './sample';

describe('buildWorkbook', () => {
  it('2シート・結合・罫線・印刷設定が入り、読み戻せる', async () => {
    const s = sampleState();
    const wb = buildWorkbook(s.meta, s.questions);
    const buf = await wb.xlsx.writeBuffer();
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf as ArrayBuffer);
    expect(back.worksheets.map((w) => w.name)).toEqual(['解答用紙', '模範解答']);

    const layout = buildLayout(s.meta, s.questions);
    const [sheet, model] = back.worksheets;
    // 内容は用紙の中央に置くので、右の余白の列には何も入らない（読み戻すと列として数えられない）
    expect(sheet.columnCount).toBeLessThanOrEqual(layout.cols);
    expect(sheet.columnCount).toBeGreaterThan(layout.cols - 8);
    expect(sheet.pageSetup.paperSize).toBe(9);
    expect(sheet.pageSetup.scale).toBe(100);
    expect(sheet.pageSetup.orientation).toBe('portrait');
    expect(sheet.pageSetup.printArea).toContain('A1:');

    // 記述欄（複数行）が結合され、外周に罫線がある
    const essay = layout.pages[0].cells.find((c) => c.kind === 'box' && c.rs >= 2)!;
    const top = sheet.getCell(essay.r + 1, essay.c + 1);
    const bottomLeft = sheet.getCell(essay.r + essay.rs, essay.c + 1);
    expect(top.isMerged || sheet.model.merges.length > 0).toBe(true);
    expect(top.border?.top?.style).toBe('thin');
    expect(bottomLeft.border?.bottom?.style).toBe('thin');

    // 模範解答は赤字の答えと配点が入り、解答用紙には入らない
    const textOf = (ws: ExcelJS.Worksheet) => {
      const out: string[] = [];
      ws.eachRow((row) => row.eachCell((c) => out.push(JSON.stringify(c.value))));
      return out.join('\n');
    };
    expect(textOf(model)).toContain('焦点');
    // 配点はどちらのシートにも書かない（AI採点で読み取れなくなるため）
    expect(textOf(model)).not.toMatch(/\d点/);
    expect(textOf(sheet)).not.toMatch(/\d点/);
    expect(textOf(model)).toContain('FFFF0000');
    expect(textOf(sheet)).not.toContain('焦点');
  });
});
