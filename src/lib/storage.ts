import { DEFAULT_META, type AppState } from './types';

const KEY = 'answer-sheet-maker:v1';

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.questions) || typeof s.meta !== 'object') return null;
    return { meta: { ...DEFAULT_META, ...s.meta }, questions: s.questions };
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

export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
