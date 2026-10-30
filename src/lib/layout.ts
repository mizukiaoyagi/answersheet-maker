import { COEF, COLOR, FONT, pageMargins, paperDims, type Writing } from './constants';
import type { AnswerType, Question, TestMeta } from './types';

/** 1pt の長さ mm */
const PT_MM = 25.4 / 72;

export type Mode = 'sheet' | 'model';
export type CellKind = 'title' | 'text' | 'frame' | 'group' | 'label' | 'box' | 'grid';

export interface LCell {
  r: number;
  c: number;
  rs: number;
  cs: number;
  kind: CellKind;
  text: string;
  label: string;
  answer: string;
  /** 物理的な左右・上下の位置（縦書きでも画面上の向き） */
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  border: { t: boolean; r: boolean; b: boolean; l: boolean };
  /** 縦書きの文字にする */
  vertical: boolean;
  /** 縦書きの用紙の中で、問題番号・得点だけ横書きにするセル */
  hText: boolean;
}

export interface PageLayout {
  /** 各行の高さ mm */
  rowHeights: number[];
  /** 各列の幅 mm */
  colWidths: number[];
  cells: LCell[];
  heightMm: number;
}

export interface Layout {
  /** 文字の進む方向に並ぶ欄の数（横書きは列数、縦書きは行数） */
  cols: number;
  pages: PageLayout[];
  usableMm: number;
  /** 1行がページより高いなどで、はみ出すページがない */
  fits: boolean;
}

export interface Run {
  text: string;
  pt: number;
  color: string;
  bold?: boolean;
}

// ---------- 文字数・種類・サイズ ----------

/** 全角＝1、半角＝0.5 */
export function charWidth(ch: string): number {
  const c = ch.codePointAt(0)!;
  return c <= 0x7e || (c >= 0xff61 && c <= 0xff9f) ? 0.5 : 1;
}

export function countChars(s: string): number {
  let n = 0;
  for (const ch of s.replace(/[\r\n]/g, '')) n += charWidth(ch);
  return n;
}

/** 数値の答え（単位付き含む）。計算問題は語句扱いにする */
export function isNumericAnswer(s: string): boolean {
  return /^[-−+＋]?[0-9０-９][0-9０-９.,，．/／]*\s*[^\d\s]{0,5}$/u.test(s.trim());
}

/** 記号らしい文字（カタカナ・英数字・丸数字など）だけか。漢字・ひらがなの語は含めない */
export function isSymbolLike(s: string): boolean {
  return /^[ァ-ヶｦ-ﾟa-zA-Zａ-ｚＡ-Ｚ0-9０-９①-⑳Ⅰ-Ⅻ,，、・\s]+$/u.test(s.trim());
}

export function suggestType(answer: string): AnswerType {
  const chars = countChars(answer);
  if (chars > COEF.WORD_MAX_CHARS) return 'essay';
  if (isNumericAnswer(answer)) return 'word';
  // 2文字以下でも「焦点」のような語は幅3の記号欄に入らないので語句にする
  if (chars <= COEF.SYMBOL_MAX_CHARS && isSymbolLike(answer)) return 'symbol';
  return 'word';
}

/** 1行（文字の進む方向）に並べられる欄の数。縦書きでは用紙の高さが基準になる */
export function paperCols(
  paper: TestMeta['paper'],
  orientation: TestMeta['orientation'],
  writing: Writing = 'horizontal',
): number {
  const p = paperDims(paper, orientation);
  const m = pageMargins(writing);
  const length = writing === 'vertical' ? p.h - m.y * 2 : p.w - m.x * 2;
  return Math.floor(length / COEF.COL_MM);
}

/** 欄の幅（列数）に収まる、1行のマス数。切りの良い数（5の倍数）にそろえる */
export function maxCellsPerRow(maxMain: number): number {
  const fit = Math.max(1, Math.min(COEF.GRID_ROW_MAX, Math.floor(maxMain / COEF.GRID_CELL_COLS)));
  const rounded = Math.floor(fit / COEF.GRID_ROW_STEP) * COEF.GRID_ROW_STEP;
  return rounded >= COEF.GRID_ROW_STEP ? rounded : fit;
}

/**
 * ページの内容の幅（列数）。マス目を切りの良い数だけ並べた欄の幅に合わせる。
 * 見出し（タイトル・得点・組番号氏名）も欄の右端・下端にそろえるため、用紙いっぱいには広げない。
 * 用紙との差は、左右（縦書きは上下）に均等に空ける。
 */
export function contentCols(physCols: number): number {
  const lead = COEF.LABEL_COLS;
  const maxMain = Math.max(1, physCols - lead);
  return lead + maxCellsPerRow(maxMain) * COEF.GRID_CELL_COLS;
}

/** 解答を書く部分（番号のセルを除く）の幅と行数。lead は欄の手前に付く番号セルの長さ */
export function boxSize(
  type: AnswerType,
  chars: number,
  cols: number,
  lead = 0,
): { mainW: number; rows: number } {
  const maxMain = Math.max(1, cols - lead);
  const cell = COEF.GRID_CELL_COLS; // 1文字ぶんの幅
  switch (type) {
    case 'symbol':
      return { mainW: Math.min(COEF.SYMBOL_WIDTH, maxMain), rows: 1 };
    case 'word': {
      const need = Math.ceil(chars * cell);
      // 幅の上限は1文字ぶんの幅の倍数にそろえる（マス目を端数なく並べられるように）
      const widest = maxCellsPerRow(maxMain) * cell;
      const mainW = Math.min(Math.max(COEF.WORD_MIN_WIDTH, need), widest);
      return { mainW, rows: Math.max(1, Math.ceil(need / mainW)) };
    }
    case 'essay': {
      const perRow = maxCellsPerRow(maxMain);
      return { mainW: perRow * cell, rows: Math.max(COEF.ESSAY_MIN_ROWS, Math.ceil(chars / perRow)) };
    }
  }
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : fallback;
}

/**
 * 大きさを指定した欄。字数×行数になり、答えの長さは関係しない。
 * 幅は欄に入る分まで。perRow は、1行に並べられるマスの数（マス目にするとき）。
 */
export function sizedBox(
  size: Question['size'],
  cols: number,
  lead = 0,
): { mainW: number; rows: number; perRow: number } {
  const maxMain = Math.max(1, cols - lead);
  const w = clampInt(size?.w, 1, 100, 5);
  const rows = clampInt(size?.rows, 1, 20, 1);
  const mainW = Math.min(w * COEF.GRID_CELL_COLS, maxMain);
  return { mainW, rows, perRow: Math.max(1, Math.floor(mainW / COEF.GRID_CELL_COLS)) };
}

/** 改行を除いた文字数（マス目に入る文字数） */
export function plainLength(s: string): number {
  return [...s.replace(/[\r\n]/g, '')].length;
}

/**
 * 欄（mainW 列 × rows 行）をマス目で埋める。マス目の有無で欄の大きさは変わらない。
 * 1行のときは字数ぶんのマスを欄いっぱいに。複数行のときは1文字ぶんの幅のマスを端まで並べ、
 * 最後の行の余りは空のマスにする（マスの大きさが揃い、欄の外周は閉じる）。
 */
export function gridCells(
  n: number,
  rows: number,
  mainW: number,
  /** 大きさを指定した欄: 1行でも、1文字ぶんの幅のマスを並べる（マスが足りない分は空白） */
  fixed = false,
): { perRow: number; widths: number[] } {
  const perRow = rows <= 1 && !fixed ? Math.max(1, n) : Math.max(1, Math.floor(mainW / COEF.GRID_CELL_COLS));
  const w = Math.max(1, Math.floor(mainW / perRow));
  const widths = Array<number>(perRow).fill(w);
  widths[perRow - 1] = Math.max(1, mainW - w * (perRow - 1));
  return { perRow, widths };
}

const KANJI_DIGITS = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** 0〜99 を漢数字にする（10→十、21→二十一）。範囲外は数字のまま */
export function toKanjiNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 99) return String(n);
  if (n < 10) return KANJI_DIGITS[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return (tens === 1 ? '' : KANJI_DIGITS[tens]) + '十' + (ones ? KANJI_DIGITS[ones] : '');
}

/** 数字だけの文字列（全角も可）なら、その数を返す。そうでなければ null */
function asNumber(text: string): number | null {
  const t = text.trim().replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** 小問番号のセルに出す文字。小問が空なら大問番号を出す。kanji=true（国語の縦書き）では大問番号を漢数字にする */
export function boxLabel(q: Pick<Question, 'major' | 'sub'>, kanji = false): string {
  const sub = q.sub.trim();
  if (!sub) {
    const n = asNumber(q.major);
    return kanji && n !== null ? toKanjiNumber(n) : q.major.trim();
  }
  if (/^[(（]/.test(sub)) return sub;
  return /^\d+$/.test(sub) ? `(${sub})` : sub;
}

/** 大問の見出し。kanji=true（国語の縦書き）では「大問一」のように漢数字にする */
export function groupLabel(major: string, kanji = false): string {
  const m = major.trim();
  const n = asNumber(m);
  if (n === null) return m;
  return `大問${kanji ? toKanjiNumber(n) : m}`;
}

// ---------- レイアウト生成 ----------

function cell(p: Partial<LCell> & Pick<LCell, 'r' | 'c' | 'cs' | 'kind'>): LCell {
  return {
    rs: 1,
    text: '',
    label: '',
    answer: '',
    align: 'left',
    valign: 'middle',
    border: { t: false, r: false, b: false, l: false },
    vertical: false,
    hText: false,
    ...p,
  };
}

const ALL = { t: true, r: true, b: true, l: true };

interface Item {
  q: Question;
  /** マス目の解答欄（全体の字数。fixed は、大きさを指定した欄） */
  grid?: { n: number; fixed: boolean };
  /** 手前の小問番号セルの長さ */
  lead: number;
  mainW: number;
  rows: number;
  x: number;
}
interface Line {
  items: Item[];
  /** 行数（行単位） */
  h: number;
  /** 右端の列 */
  end: number;
}

/** 大問内の欄を左から詰めて、入らなければ折り返す */
function packGroup(g: Question[], cols: number, lead: number): Line[] {
  const lines: Line[] = [];
  let items: Item[] = [];
  let x = 0;
  const flush = () => {
    if (!items.length) return;
    lines.push({ items, h: Math.max(...items.map((i) => i.rows)), end: x });
    items = [];
    x = 0;
  };
  for (const q of g) {
    // 欄の大きさは、マス目があってもなくても同じ規則（マス目なら指定字数、なければ模範解答の字数）で決める
    // マス目の数（0 ならマス目なし）と、マスを1文字ぶんの幅で並べる欄か（fixed）
    let n = 0;
    let fixed = true;
    let size: { mainW: number; rows: number };
    const len = plainLength(q.answer);
    if (q.size) {
      // 大きさを指定した欄。マス目なら、その欄をマスで埋める
      const box = sizedBox(q.size, cols, lead);
      if (q.grid) n = box.perRow * box.rows;
      size = box;
    } else if (q.grid && len > 0) {
      // 模範解答の字数ちょうどのマス。欄の大きさもその字数で決まる
      // 2マス以上のマス目は、記号の欄には入らないので語句の大きさで作る
      const type = len > COEF.SYMBOL_GRID_MAX && q.type === 'symbol' ? 'word' : q.type;
      size = boxSize(type, len, cols, lead);
      n = len;
      fixed = false;
    } else {
      // 大きさは模範解答の長さに合わせる。模範解答が空のマス目は、その大きさの欄を埋める
      size = boxSize(q.type, countChars(q.answer), cols, lead);
      if (q.grid) n = Math.max(1, Math.floor(size.mainW / COEF.GRID_CELL_COLS)) * size.rows;
    }
    const { mainW, rows } = size;
    const item: Omit<Item, 'x'> = {
      q,
      lead,
      mainW,
      rows,
      ...(n > 0 ? { grid: { n, fixed } } : {}),
    };
    const total = item.lead + item.mainW;
    if (items.length && x + COEF.GAP_COLS + total > cols) flush();
    const at = items.length ? x + COEF.GAP_COLS : 0;
    items.push({ ...item, x: at });
    x = at + total;
  }
  flush();
  return lines;
}

class PageBuilder {
  rowHeights: number[] = [];
  cells: LCell[] = [];
  /** 設問部分（ヘッダーより下）の行数 */
  bodyUnits = 0;
  addRow(h: number): number {
    return this.rowHeights.push(h) - 1;
  }
  get units(): number {
    return this.rowHeights.reduce((a, b) => a + b, 0);
  }
}

/**
 * タイトル → 組・番号・氏名 → 得点 の順に、上から並べる（2枚目以降は何も置かない）。
 * 組・番号・氏名と得点は、答案をめくりながら探しやすいよう、すぐ近くの右端（縦書きは下端）にそろえる。
 */
function addHeader(pb: PageBuilder, meta: TestMeta, cols: number, first: boolean) {
  if (first) {
    const r = pb.addRow(COEF.TITLE_ROWS);
    pb.cells.push(cell({ r, c: 0, cs: cols, kind: 'title', text: meta.title, align: 'center' }));
    addNameFields(pb, meta, cols);
    addScore(pb, meta, cols);
  }
  pb.addRow(COEF.SPACER_ROWS);
}

function addNameFields(pb: PageBuilder, meta: TestMeta, cols: number) {
  const fields: { label: string; w: number }[] = [];
  if (meta.hasClass) fields.push({ label: '組', w: 3 });
  if (meta.hasNumber) fields.push({ label: '番号', w: 3 });
  if (meta.hasName) fields.push({ label: '氏名', w: 12 });
  if (!fields.length) return;
  pb.addRow(COEF.INFO_GAP_ROWS);
  const r = pb.addRow(COEF.NAME_ROWS);
  const labelW = (label: string) => (label.length === 1 ? 2 : 3);
  const width = fields.reduce((s, f, i) => s + (i > 0 ? COEF.HEADER_GAP_COLS : 0) + labelW(f.label) + f.w, 0);
  let x = Math.max(0, cols - width);
  fields.forEach((f, i) => {
    if (i > 0) x += COEF.HEADER_GAP_COLS;
    const lw = labelW(f.label);
    pb.cells.push(cell({ r, c: x, cs: lw, kind: 'frame', text: f.label, align: 'center', border: ALL }));
    x += lw;
    const w = Math.min(f.w, Math.max(1, cols - x));
    pb.cells.push(cell({ r, c: x, cs: w, kind: 'frame', border: ALL }));
    x += w;
  });
}

/** 得点欄: 「得点」の枠と、満点 */
function addScore(pb: PageBuilder, meta: TestMeta, cols: number) {
  pb.addRow(COEF.INFO_GAP_ROWS);
  const r = pb.addRow(COEF.INFO_ROWS);
  const totalW = meta.writing === 'vertical' ? COEF.SCORE_TOTAL_COLS_VERTICAL : COEF.SCORE_TOTAL_COLS;
  const scoreW = COEF.SCORE_LABEL_COLS + COEF.SCORE_BOX_COLS + totalW;
  pb.cells.push(
    cell({
      r,
      c: cols - scoreW,
      cs: COEF.SCORE_LABEL_COLS,
      kind: 'frame',
      text: '得点',
      align: 'center',
      border: ALL,
      hText: true,
    }),
  );
  pb.cells.push(
    cell({
      r,
      c: cols - scoreW + COEF.SCORE_LABEL_COLS,
      cs: COEF.SCORE_BOX_COLS,
      kind: 'frame',
      border: ALL,
      hText: true,
    }),
  );
  pb.cells.push(
    cell({
      r,
      c: cols - totalW,
      cs: totalW,
      kind: 'text',
      text: `／${meta.fullScore}`,
      // 横書きは右下寄せ、縦書きは下の中央寄せ
      align: 'right',
      valign: meta.writing === 'vertical' ? 'middle' : 'bottom',
      hText: true,
    }),
  );
}

function addGroupHeader(pb: PageBuilder, cols: number, text: string) {
  const r = pb.addRow(COEF.GROUP_ROWS);
  pb.cells.push(cell({ r, c: 0, cs: cols, kind: 'group', text, valign: 'bottom' }));
  pb.bodyUnits += COEF.GROUP_ROWS;
}

function addLine(pb: PageBuilder, line: Line, prevEnd: number | null, vertical: boolean) {
  const row = pb.addRow(1);
  for (let k = 1; k < line.h; k++) pb.addRow(1);
  pb.bodyUnits += line.h;
  for (const it of line.items) {
    // 上の行の欄の下罫線を共有できるなら上罫線は省く
    const top = !(prevEnd !== null && it.x + it.lead + it.mainW <= prevEnd);
    const left = it.x === 0 || COEF.GAP_COLS > 0;
    // 小問番号は、欄の手前に独立したセルとして置き、解答欄とは線で区切る（横書きも縦書きも同じ）
    const rs = it.grid ? it.rows : line.h;
    pb.cells.push(
      cell({
        r: row,
        c: it.x,
        rs,
        cs: it.lead,
        kind: 'label',
        label: boxLabel(it.q, vertical),
        align: 'center',
        valign: 'middle',
        hText: true,
        border: { t: top, b: true, l: left, r: true },
      }),
    );
    if (it.grid) {
      // 指定した字数ちょうどのマスを左上から並べる。罫線は右と下を基本に、左端の列は左、最上段は上も付けて、
      // 隣と重ならないようにする。マスが足りない部分は空白にして、欄全体の外周を閉じる
      const n = it.grid.n;
      const chars = [...it.q.answer.replace(/[\r\n]/g, '')];
      const { perRow, widths } = gridCells(n, it.rows, it.mainW, it.grid.fixed);
      const x0 = it.x + it.lead;
      const edges = widths.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w], [0]);
      for (let i = 0; i < n; i++) {
        const gr = Math.floor(i / perRow);
        const gc = i % perRow;
        pb.cells.push(
          cell({
            r: row + gr,
            c: x0 + edges[gc],
            cs: widths[gc],
            kind: 'grid',
            answer: chars[i] ?? '',
            align: 'center',
            valign: 'middle',
            border: { t: gr === 0 && top, b: true, l: gc === 0, r: true },
          }),
        );
      }
      const lastRow = Math.ceil(n / perRow) - 1;
      const kLast = n - lastRow * perRow;
      if (kLast < perRow) {
        // 最後の行の残り
        pb.cells.push(
          cell({
            r: row + lastRow,
            c: x0 + edges[kLast],
            cs: it.mainW - edges[kLast],
            kind: 'box',
            border: { t: lastRow === 0 && top, b: lastRow === it.rows - 1, l: false, r: true },
          }),
        );
      }
      if (lastRow < it.rows - 1) {
        // マスの行より下に残る空白の行
        pb.cells.push(
          cell({
            r: row + lastRow + 1,
            rs: it.rows - 1 - lastRow,
            c: x0,
            cs: it.mainW,
            kind: 'box',
            border: { t: false, b: true, l: true, r: true },
          }),
        );
      }
    } else {
      pb.cells.push(
        cell({
          r: row,
          c: it.x + it.lead,
          rs: line.h,
          cs: it.mainW,
          kind: 'box',
          answer: it.q.answer,
          // 解答は欄の真ん中に寄せる（横書きは上下、縦書きは左右）
          valign: 'middle',
          border: { t: top, b: true, l: false, r: true },
        }),
      );
    }
  }
}

function toHorizontal(pb: PageBuilder, cols: number, colMm: number, rowMm: number): PageLayout {
  const rowHeights = pb.rowHeights.map((u) => u * rowMm);
  return {
    rowHeights,
    colWidths: Array<number>(cols).fill(colMm),
    cells: pb.cells.map((c) => ({ ...c, hText: false })),
    heightMm: rowHeights.reduce((a, b) => a + b, 0),
  };
}

const V_ALIGN = { top: 'right', middle: 'center', bottom: 'left' } as const;
const V_VALIGN = { left: 'top', center: 'middle', right: 'bottom' } as const;

/**
 * 横書きで組んだページを縦書きに変換する。
 * 文字の進む方向（左→右）を上→下に、行の積み重なる方向（上→下）を右→左に置き換える。
 * 全ページで列の構成をそろえるため、余った幅は空の列で埋める（Excel は列幅が全ページ共通のため）。
 */
function toVertical(pb: PageBuilder, cols: number, usableUnits: number, colMm: number, rowMm: number): PageLayout {
  const units = pb.rowHeights.slice();
  let sum = units.reduce((a, b) => a + b, 0);
  while (sum + 1 <= usableUnits) {
    units.push(1);
    sum += 1;
  }
  // 端数は最後の列で埋めて、どのページも同じ幅にする（0.2行単位）
  const rest = Math.floor((usableUnits - sum) * 5) / 5;
  if (rest > 0) units.push(rest);
  const n = units.length;
  const cells = pb.cells.map((c) =>
    cell({
      ...c,
      r: c.c,
      rs: c.cs,
      c: n - 1 - (c.r + c.rs - 1),
      cs: c.rs,
      border: { t: c.border.l, b: c.border.r, r: c.border.t, l: c.border.b },
      align: V_ALIGN[c.valign],
      valign: V_VALIGN[c.align],
      vertical: !c.hText,
    }),
  );
  return {
    rowHeights: Array<number>(cols).fill(colMm),
    colWidths: units.map((u) => u * rowMm).reverse(),
    cells,
    heightMm: cols * colMm,
  };
}

export function buildLayout(meta: TestMeta, questions: Question[]): Layout {
  const vertical = meta.writing === 'vertical';
  const physCols = paperCols(meta.paper, meta.orientation, meta.writing);
  const cols = contentCols(physCols);
  // 内容は用紙の中央に置く（左右、縦書きは上下に同じだけ空ける）
  const offset = Math.floor((physCols - cols) / 2);
  const { w, h } = paperDims(meta.paper, meta.orientation);
  const mg = pageMargins(meta.writing);
  const usableMm = h - mg.y * 2;
  // 行が積み重なる方向の長さ（横書きは高さ、縦書きは幅）
  const stackMm = vertical ? w - mg.x * 2 : h - mg.y * 2;
  const usableUnits = stackMm / COEF.ROW_MM + 1e-6;

  const pages: PageBuilder[] = [];
  const newPage = () => {
    const pb = new PageBuilder();
    addHeader(pb, meta, cols, pages.length === 0);
    pages.push(pb);
    return pb;
  };
  let cur = newPage();

  // 大問ごとにまとめる（連続する同じ大問番号）
  const groups: Question[][] = [];
  for (const q of questions) {
    const last = groups[groups.length - 1];
    if (last && last[0].major.trim() === q.major.trim()) last.push(q);
    else groups.push([q]);
  }

  for (const g of groups) {
    const label = groupLabel(g[0].major, vertical);
    const lines = packGroup(g, cols, COEF.LABEL_COLS);
    // 大問の見出しだけが前のページに取り残されないよう、見出し＋最初の行が入るか確認する
    if (cur.bodyUnits > 0 && cur.units + COEF.GROUP_ROWS + lines[0].h > usableUnits) cur = newPage();
    addGroupHeader(cur, cols, label);
    let prevEnd: number | null = null;
    lines.forEach((line, i) => {
      if (i > 0 && cur.units + line.h > usableUnits) {
        cur = newPage();
        addGroupHeader(cur, cols, label);
        prevEnd = null;
      }
      addLine(cur, line, prevEnd, vertical);
      prevEnd = line.end;
    });
  }

  const fits = pages.every((pb) => pb.units <= usableUnits);
  for (const pb of pages) for (const c of pb.cells) c.c += offset;
  const out = pages.map((pb) =>
    vertical
      ? toVertical(pb, physCols, usableUnits, COEF.COL_MM, COEF.ROW_MM)
      : toHorizontal(pb, physCols, COEF.COL_MM, COEF.ROW_MM),
  );
  return { cols: physCols, pages: out, usableMm, fits };
}

// ---------- セルの表示内容（プレビュー・Excel 共通） ----------

/** 小問番号の文字サイズ。幅（0.5文字分）に収まるよう、文字数に合わせて小さくする */
function labelPt(c: LCell): number {
  // 縦書きの用紙では横書きの幅に余裕があるので、そのままの大きさ
  if (c.hText) return FONT.LABEL_PT;
  const avail = c.cs * COEF.COL_MM - 1;
  const fit = Math.floor((avail / PT_MM / Math.max(1, countChars(c.label))) * 2) / 2;
  return Math.max(5, Math.min(FONT.LABEL_PT, fit));
}

export function cellRuns(c: LCell, mode: Mode): Run[] {
  const black = COLOR.BLACK;
  // 縦書きでは半角スペースも1文字分の高さを取って間延びするので、タイトル等からは省く
  const text = c.vertical ? c.text.replace(/ /g, '') : c.text;
  switch (c.kind) {
    case 'title': {
      return text ? [{ text, pt: FONT.TITLE_PT, color: black, bold: true }] : [];
    }
    case 'text':
    case 'frame': {
      // 縦書きの用紙の中の「得点」「／100」は、狭い列に横書きで入るので小さめにする
      const pt = c.hText ? (c.kind === 'text' ? FONT.H_TEXT_PT : FONT.H_TEXT_PT + 1) : FONT.TEXT_PT;
      return text ? [{ text, pt, color: black }] : [];
    }
    case 'group':
      return text ? [{ text, pt: FONT.TEXT_PT, color: black, bold: true }] : [];
    case 'label':
      return c.label ? [{ text: c.label, pt: labelPt(c), color: COLOR.LABEL }] : [];
    case 'box': {
      const ans = mode === 'model' ? c.answer : '';
      return ans ? [{ text: ans, pt: FONT.ANSWER_PT, color: COLOR.RED }] : [];
    }
    case 'grid':
      return mode === 'model' && c.answer ? [{ text: c.answer, pt: FONT.GRID_PT, color: COLOR.RED }] : [];
  }
}

export function totalPoints(questions: Question[]): number {
  // 小数の誤差を避ける
  return Math.round(questions.reduce((s, q) => s + (Number(q.points) || 0), 0) * 100) / 100;
}
