import { newId } from './id';
import { DEFAULT_META, type AppState, type Question } from './types';

export function emptyState(): AppState {
  return { meta: { ...DEFAULT_META }, questions: [] };
}

/** 直前の設問の続きとして、新しい設問を作る（大問は同じ、小問番号は数字なら +1） */
export function nextQuestion(prev?: Question): Question {
  const sub = prev && /^\d+$/.test(prev.sub.trim()) ? String(Number(prev.sub) + 1) : '';
  return {
    id: newId(),
    major: prev ? prev.major : '1',
    sub,
    type: 'symbol',
    typeManual: false,
    answer: '',
    points: 5,
  };
}

/**
 * fromId の設問を、targetId の設問の上側（after=false）または下側（after=true）へ移す。
 * 位置が変わらないときや、設問が見つからないときは、元の配列をそのまま返す。
 */
export function moveQuestion(questions: Question[], fromId: string, targetId: string, after: boolean): Question[] {
  const from = questions.findIndex((q) => q.id === fromId);
  const target = questions.findIndex((q) => q.id === targetId);
  if (from < 0 || target < 0) return questions;
  let to = after ? target + 1 : target;
  if (from < to) to -= 1;
  if (from === to) return questions;
  const qs = questions.slice();
  const [moved] = qs.splice(from, 1);
  qs.splice(to, 0, moved);
  return qs;
}
