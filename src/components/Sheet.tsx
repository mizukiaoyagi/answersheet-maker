import { memo, useMemo, type CSSProperties } from 'react';
import { FONT, pageMargins, paperDims } from '../lib/constants';
import { cellRuns, type Mode, type PageLayout } from '../lib/layout';
import type { TestMeta } from '../lib/types';

const JUSTIFY = { top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const;
const JUSTIFY_X = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;
/** 罫線の太さ mm */
const LINE_MM = 0.25;

type Span = [number, number];

/** 同じ線上の区間を、重なり・接している分も含めて1本にまとめる */
function merge(spans: Span[]): Span[] {
  const sorted = spans.slice().sort((a, b) => a[0] - b[0]);
  const out: Span[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push([s[0], s[1]]);
  }
  return out;
}

/**
 * 各セルの罫線を、グリッド線ごとの線分にまとめ直す。
 * 隣り合うセルがどちらも罫線を持っていても1本として描けるので、線が二重になって太く見えない。
 */
function borderLines(page: PageLayout) {
  const xs = page.colWidths.reduce<number[]>((a, w) => [...a, a[a.length - 1] + w], [0]);
  const ys = page.rowHeights.reduce<number[]>((a, h) => [...a, a[a.length - 1] + h], [0]);
  const hs = new Map<number, Span[]>(); // y のグリッド線 → x 方向の区間
  const vs = new Map<number, Span[]>(); // x のグリッド線 → y 方向の区間
  const add = (m: Map<number, Span[]>, k: number, s: Span) => m.set(k, [...(m.get(k) ?? []), s]);
  for (const c of page.cells) {
    if (c.border.t) add(hs, c.r, [c.c, c.c + c.cs]);
    if (c.border.b) add(hs, c.r + c.rs, [c.c, c.c + c.cs]);
    if (c.border.l) add(vs, c.c, [c.r, c.r + c.rs]);
    if (c.border.r) add(vs, c.c + c.cs, [c.r, c.r + c.rs]);
  }
  const lines: CSSProperties[] = [];
  const half = LINE_MM / 2;
  for (const [y, spans] of hs)
    for (const [a, b] of merge(spans))
      lines.push({
        left: `${xs[a] - half}mm`,
        top: `${ys[y] - half}mm`,
        width: `${xs[b] - xs[a] + LINE_MM}mm`,
        height: `${LINE_MM}mm`,
      });
  for (const [x, spans] of vs)
    for (const [a, b] of merge(spans))
      lines.push({
        left: `${xs[x] - half}mm`,
        top: `${ys[a] - half}mm`,
        width: `${LINE_MM}mm`,
        height: `${ys[b] - ys[a] + LINE_MM}mm`,
      });
  return lines;
}

function SheetImpl({ page, meta, mode }: { page: PageLayout; meta: TestMeta; mode: Mode }) {
  const paper = paperDims(meta.paper, meta.orientation);
  const mg = pageMargins(meta.writing);
  const gridW = page.colWidths.reduce((a, b) => a + b, 0);
  const lines = useMemo(() => borderLines(page), [page]);
  const sheetStyle: CSSProperties = {
    width: `${paper.w}mm`,
    height: `${paper.h - 1}mm`,
    paddingTop: `${mg.y}mm`,
    // 横書きは左上、縦書きは右上に寄せる
    paddingLeft: `${meta.writing === 'vertical' ? Math.max(mg.x, paper.w - mg.x - gridW) : mg.x}mm`,
    fontFamily: FONT.CSS_FAMILY,
  };
  const gridStyle: CSSProperties = {
    width: `${gridW}mm`,
    gridTemplateColumns: page.colWidths.map((w) => `${w}mm`).join(' '),
    gridTemplateRows: page.rowHeights.map((h) => `${h}mm`).join(' '),
  };

  return (
    <div className="sheet" style={sheetStyle} data-mode={mode}>
      <div className="sheet-grid" style={gridStyle}>
        {page.cells.map((c, i) => {
          const runs = cellRuns(c, mode);
          const style: CSSProperties = {
            gridRow: `${c.r + 1} / span ${c.rs}`,
            gridColumn: `${c.c + 1} / span ${c.cs}`,
            // 縦書きの文字は内側の要素に writing-mode を付け、位置合わせは外側で物理方向に行う
            ...(c.vertical
              ? { flexDirection: 'row', justifyContent: JUSTIFY_X[c.align], alignItems: JUSTIFY[c.valign] }
              : { justifyContent: JUSTIFY[c.valign], textAlign: c.align }),
            // 小問番号は折り返さない（縦書きで列が割れるのを防ぐ）
            ...(c.kind === 'label' || c.hText ? { whiteSpace: 'nowrap' as const } : {}),
          };
          return (
            <div key={i} className={c.vertical ? 'sheet-cell vcell' : c.hText ? 'sheet-cell hcell' : 'sheet-cell'} style={style}>
              {runs.length > 0 && (
                <div className={c.vertical ? 'v-text' : undefined}>
                  {runs.map((r, k) => (
                    <span
                      key={k}
                      style={{ fontSize: `${r.pt}pt`, color: `#${r.color}`, fontWeight: r.bold ? 700 : 400 }}
                    >
                      {r.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {lines.map((s, i) => (
          <div key={`l${i}`} className="sheet-line" style={s} />
        ))}
      </div>
    </div>
  );
}

export const Sheet = memo(SheetImpl);
