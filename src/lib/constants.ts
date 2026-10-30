// 解答欄サイズ・レイアウトの係数。調整はここだけで行う。
export const COEF = {
  /** 1グリッド列（全角1文字分）の幅 mm */
  COL_MM: 5,
  /** 1グリッド行の高さ mm */
  ROW_MM: 10,

  /** 記号と判定する最大文字数（全角換算） */
  SYMBOL_MAX_CHARS: 2,
  /** 語句と判定する最大文字数（全角換算） */
  WORD_MAX_CHARS: 15,

  /** 記号（択一）: 幅（列数）。1.5文字分 */
  SYMBOL_WIDTH: 3,
  /** 記号の欄にできるマス目の字数（これを超えると語句の大きさにする） */
  SYMBOL_GRID_MAX: 1,
  /** 語句: 最小幅（全角文字数分） */
  WORD_MIN_WIDTH: 6,
  /** 記述: 最低行数 */
  ESSAY_MIN_ROWS: 2,

  /** 1文字ぶんの幅（列数）。高さは1行なので 10mm 四方。語句・記述の欄の大きさも、マス目もこれが基準 */
  GRID_CELL_COLS: 2,
  /** 1行（縦書きでは1列）に並べるマスの最大数 */
  GRID_ROW_MAX: 20,
  /** 1行のマス数は、この数の倍数に切り下げて切りの良い数にする（入りきらない用紙のときは入るだけ） */
  GRID_ROW_STEP: 5,

  /** 小問番号のセルの幅（列数）。0.5文字分 */
  LABEL_COLS: 1,

  /** 同じ行に並ぶ解答欄の間隔（列数）。0 なら欄がつながる */
  GAP_COLS: 0,
  /** 組・番号・氏名の記入欄の間隔（列数） */
  HEADER_GAP_COLS: 0,

  /** ヘッダー各行の高さ（行単位） */
  TITLE_ROWS: 1.8,
  INFO_ROWS: 1.4,
  /** 得点欄の「得点」ラベル・点数を書く欄・「／満点」の幅（列数） */
  SCORE_LABEL_COLS: 3,
  SCORE_BOX_COLS: 6,
  SCORE_TOTAL_COLS: 3,
  /** 縦書きでは「／満点」の欄の長さ（高さ）を短くする */
  SCORE_TOTAL_COLS_VERTICAL: 2,
  NAME_ROWS: 1,
  /** タイトル・組番号氏名・得点の各行の間（名前と得点は近くに置く） */
  INFO_GAP_ROWS: 0.3,
  SPACER_ROWS: 0.4,
  GROUP_ROWS: 1,
} as const;

export const FONT = {
  TITLE_PT: 20,
  TEXT_PT: 12,
  ANSWER_PT: 13,
  /** 小問番号の最大の文字サイズ（幅が狭いときは収まるよう小さくする） */
  LABEL_PT: 9,
  /** マス目に入れる模範解答の文字 */
  GRID_PT: 15,
  /** 縦書きの用紙の中で横書きにするセル（問題番号・得点）の文字 */
  H_TEXT_PT: 10,
  /** Excel でも CSS でも同じ。無ければ OS 側で代替される */
  EXCEL_FAMILY: '游ゴシック',
  CSS_FAMILY: '"Yu Gothic", "游ゴシック", "YuGothic", Meiryo, "メイリオ", sans-serif',
} as const;

export const COLOR = {
  BLACK: '000000',
  LABEL: '595959',
  RED: 'FF0000',
} as const;

export type PaperSize = 'A4' | 'B4';
export type Orientation = 'portrait' | 'landscape';
export type Writing = 'horizontal' | 'vertical';

export const PAPERS: Record<PaperSize, { w: number; h: number; excelPaperSize: number }> = {
  A4: { w: 210, h: 297, excelPaperSize: 9 },
  B4: { w: 257, h: 364, excelPaperSize: 12 },
};

/**
 * 用紙の余白 mm。x は左右、y は上下。
 * 横書きは左右を広め（穴あけ・見た目）、縦書きは上下を広めにする。
 */
export function pageMargins(writing: Writing): { x: number; y: number } {
  return writing === 'vertical' ? { x: 10, y: 15 } : { x: 15, y: 10 };
}

/** 向きを反映した用紙寸法 mm */
export function paperDims(paper: PaperSize, orientation: Orientation) {
  const p = PAPERS[paper];
  return orientation === 'landscape' ? { ...p, w: p.h, h: p.w } : p;
}
