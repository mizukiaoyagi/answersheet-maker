import { suggestType } from './layout';
import { DEFAULT_META, type AppState, type Question } from './types';

const KEY = 'answersheet-maker:v1';

/** 古い保存データの設問を、いまの形に直す: 種類「カスタム」は廃止、マス目は字数ではなく有無にした */
function migrateQuestion(
  q: Omit<Question, 'type' | 'grid'> & {
    type: string;
    grid?: boolean | number;
    custom?: { w: number; rows: number; grid: boolean };
  },
): Question {
  const { custom, grid, ...rest } = q;
  const base = { ...rest, ...(grid ? { grid: true } : {}) };
  if (q.type !== 'custom') return base as Question;
  return {
    ...base,
    type: suggestType(q.answer),
    typeManual: false,
    ...(custom ? { size: { w: custom.w, rows: custom.rows } } : {}),
    ...(custom?.grid ? { grid: true } : {}),
  };
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.questions) || typeof s.meta !== 'object') return null;
    return { meta: { ...DEFAULT_META, ...s.meta }, questions: s.questions.map(migrateQuestion) };
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

const LAYOUT_KEY = 'answersheet-maker:layout';

/** 画面の使い方: 左右に並べたときのプレビューの開閉と、入力側の幅の割合 */
export interface PaneLayout {
  open: boolean;
  /** 入力側の幅の割合（0〜1） */
  ratio: number;
}

export const DEFAULT_PANE_LAYOUT: PaneLayout = { open: true, ratio: 0.5 };
/** 割合の範囲（ドラッグで動かせる幅） */
export const RATIO_MIN = 0.25;
export const RATIO_MAX = 0.75;

export function loadPaneLayout(): PaneLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    const s = raw ? JSON.parse(raw) : null;
    const ratio = Number(s?.ratio);
    return {
      open: typeof s?.open === 'boolean' ? s.open : DEFAULT_PANE_LAYOUT.open,
      ratio: Number.isFinite(ratio) ? Math.min(RATIO_MAX, Math.max(RATIO_MIN, ratio)) : DEFAULT_PANE_LAYOUT.ratio,
    };
  } catch {
    return DEFAULT_PANE_LAYOUT;
  }
}

export function savePaneLayout(layout: PaneLayout): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* 保存できなくても動作は続ける */
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
