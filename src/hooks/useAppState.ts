import { useCallback, useEffect, useState } from 'react';
import { emptyState, moveQuestion, nextQuestion } from '../lib/questions';
import { suggestType } from '../lib/layout';
import { sampleState, type SampleKind } from '../lib/sample';
import { clearState, loadState, saveState } from '../lib/storage';
import type { AppState, Question, TestMeta } from '../lib/types';

/** 入力内容（テスト情報と設問）と、その編集操作。変更のたびに localStorage へ保存する */
export function useAppState() {
  const [state, setState] = useState<AppState>(() => loadState() ?? emptyState());

  useEffect(() => saveState(state), [state]);

  const setMeta = useCallback(
    (patch: Partial<TestMeta>) => setState((s) => ({ ...s, meta: { ...s.meta, ...patch } })),
    [],
  );

  const updateQuestion = useCallback(
    (id: string, patch: Partial<Question>) =>
      setState((s) => ({ ...s, questions: s.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })),
    [],
  );

  /** 模範解答を変える。種類を手動で選んでいなければ、文字数から種類も自動で決め直す */
  const setAnswer = useCallback(
    (id: string, answer: string) =>
      setState((s) => ({
        ...s,
        questions: s.questions.map((q) =>
          q.id === id ? { ...q, answer, type: q.typeManual ? q.type : suggestType(answer) } : q,
        ),
      })),
    [],
  );

  const removeQuestion = useCallback(
    (id: string) => setState((s) => ({ ...s, questions: s.questions.filter((q) => q.id !== id) })),
    [],
  );

  const move = useCallback(
    (fromId: string, targetId: string, after: boolean) =>
      setState((s) => {
        const questions = moveQuestion(s.questions, fromId, targetId, after);
        return questions === s.questions ? s : { ...s, questions };
      }),
    [],
  );

  /** 設問を末尾に足して、その id を返す */
  const addQuestion = useCallback((): string => {
    const q = nextQuestion(state.questions.at(-1));
    setState((s) => ({ ...s, questions: [...s.questions, q] }));
    return q.id;
  }, [state.questions]);

  const loadSample = useCallback((kind: SampleKind) => setState(sampleState(kind)), []);

  const clearAll = useCallback(() => {
    clearState();
    setState(emptyState());
  }, []);

  return { state, setMeta, updateQuestion, setAnswer, removeQuestion, move, addQuestion, loadSample, clearAll };
}
