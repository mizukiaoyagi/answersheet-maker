import ExcelJS from 'exceljs';
import { FONT, pageMargins, PAPERS } from './constants';
import { buildLayout, cellRuns, type LCell, type Layout, type Mode } from './layout';
import type { Question, TestMeta } from './types';

const PT_PER_MM = 72 / 25.4;
const PX_PER_MM = 96 / 25.4;
/** Excel の列幅は「標準フォントの数字1文字(7px)」単位 */
const colWidth = (mm: number) => (mm * PX_PER_MM) / 7;
const MM_TO_INCH = 1 / 25.4;

function fillSheet(ws: ExcelJS.Worksheet, layout: Layout, meta: TestMeta, mode: Mode) {
  const paper = PAPERS[meta.paper];
  const mg = pageMargins(meta.writing);

  // Excel の列幅は全ページ共通。ページごとに列の幅が違っても（縦書きの2枚目以降など）
  // 良いように、全ページの列の境目を合わせた細かい列に分け、セルはそれらを結合して作る
  const round = (n: number) => Math.round(n * 100) / 100;
  const edgesOf = (widths: number[]) =>
    widths.reduce<number[]>((acc, w) => [...acc, round(acc[acc.length - 1] + w)], [0]);
  const xs = [...new Set(layout.pages.flatMap((p) => edgesOf(p.colWidths)))].sort((a, b) => a - b);
  const colWidths = xs.slice(1).map((x, i) => round(x - xs[i]));
  colWidths.forEach((w, i) => {
    ws.getColumn(i + 1).width = colWidth(w);
  });

  const thin: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };

  // 各ページを縦に積み、ページの境目に改ページを入れる
  let rowOffset = 0;
  layout.pages.forEach((page, pi) => {
    page.rowHeights.forEach((h, i) => {
      ws.getRow(rowOffset + i + 1).height = h * PT_PER_MM;
    });

    const edges = edgesOf(page.colWidths);
    for (const c of page.cells) {
      const r1 = rowOffset + c.r + 1;
      const c1 = xs.indexOf(edges[c.c]) + 1;
      const r2 = rowOffset + c.r + c.rs;
      const c2 = xs.indexOf(edges[c.c + c.cs]);
      // 結合範囲の外周の各セルに罫線を付ける（結合前に個別のスタイルとして設定する）
      for (let rr = r1; rr <= r2; rr++) {
        for (let cc = c1; cc <= c2; cc++) {
          const border: Partial<ExcelJS.Borders> = {};
          if (c.border.t && rr === r1) border.top = thin;
          if (c.border.b && rr === r2) border.bottom = thin;
          if (c.border.l && cc === c1) border.left = thin;
          if (c.border.r && cc === c2) border.right = thin;
          if (Object.keys(border).length) ws.getCell(rr, cc).border = border;
        }
      }

      if (r2 > r1 || c2 > c1) ws.mergeCellsWithoutStyle(r1, c1, r2, c2);

      const master = ws.getCell(r1, c1);
      // 小問番号と、縦書きの用紙の中の小さな横書きセル（得点・小問番号）は、折り返さずに収まるよう縮小する
      const shrink = c.hText || c.kind === 'label';
      master.alignment = {
        horizontal: c.align,
        vertical: c.valign,
        wrapText: !shrink,
        ...(shrink ? { shrinkToFit: true } : {}),
        // 縦書きは「縦書き」（1文字ずつ上から下へ並べる）の指定にする
        ...(c.vertical ? { textRotation: 'vertical' as const } : {}),
      };
      master.font = { name: FONT.EXCEL_FAMILY, size: FONT.TEXT_PT };
      applyValue(master, c, mode);
    }

    rowOffset += page.rowHeights.length;
    if (pi < layout.pages.length - 1) ws.getRow(rowOffset).addPageBreak();
  });

  ws.views = [{ showGridLines: false }];
  // 「1ページに合わせる」だと手動の改ページが無視されるため、拡大率100%で指定する
  ws.pageSetup = {
    paperSize: paper.excelPaperSize,
    orientation: meta.orientation,
    scale: 100,
    margins: {
      left: mg.x * MM_TO_INCH,
      right: mg.x * MM_TO_INCH,
      top: mg.y * MM_TO_INCH,
      bottom: mg.y * MM_TO_INCH,
      header: 0.2,
      footer: 0.2,
    },
    printArea: `A1:${ws.getColumn(colWidths.length).letter}${rowOffset}`,
  };
}

function applyValue(cell: ExcelJS.Cell, c: LCell, mode: Mode) {
  const runs = cellRuns(c, mode);
  if (!runs.length) return;
  cell.value = {
    richText: runs.map((r) => ({
      text: r.text,
      font: {
        name: FONT.EXCEL_FAMILY,
        size: r.pt,
        bold: !!r.bold,
        color: { argb: `FF${r.color}` },
      },
    })),
  };
}

export function buildWorkbook(meta: TestMeta, questions: Question[]): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = '解答用紙メーカー';
  const layout = buildLayout(meta, questions);
  fillSheet(wb.addWorksheet('解答用紙'), layout, meta, 'sheet');
  fillSheet(wb.addWorksheet('模範解答'), layout, meta, 'model');
  return wb;
}

export async function downloadXlsx(meta: TestMeta, questions: Question[]): Promise<void> {
  const wb = buildWorkbook(meta, questions);
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const name = (meta.title.trim() || '解答用紙').replace(/[\\/:*?"<>|]/g, '_');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
