import { newId } from './id';
import { DEFAULT_META, type AppState, type Question } from './types';

export function emptyState(): AppState {
  return { meta: { ...DEFAULT_META }, questions: [] };
}

/** 初めて開いたときの状態: 大問1の小問1〜3が、模範解答は空欄のまま入っている */
export function initialState(): AppState {
  const questions = ['1', '2', '3'].map((sub): Question => ({
    id: newId(),
    major: '1',
    sub,
    type: 'symbol',
    typeManual: false,
    answer: '',
    points: 5,
  }));
  return { meta: { ...DEFAULT_META }, questions };
}

/**
 * 直前の設問の続きとして、新しい設問を作る。
 * 大問は同じ、小問番号は数字なら +1。種類・マス目・大きさ・配点は直前の設問を引き継ぐ
 * （同じ形の問題が続くとき、設定し直さずに済む）。模範解答は空。
 */
export function nextQuestion(prev?: Question): Question {
  const sub = prev && /^\d+$/.test(prev.sub.trim()) ? String(Number(prev.sub) + 1) : '';
  return {
    id: newId(),
    major: prev ? prev.major : '1',
    sub,
    type: prev ? prev.type : 'symbol',
    typeManual: prev ? prev.typeManual : false,
    answer: '',
    points: prev ? prev.points : 5,
    ...(prev?.grid !== undefined ? { grid: prev.grid } : {}),
    ...(prev?.size ? { size: { ...prev.size } } : {}),
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
