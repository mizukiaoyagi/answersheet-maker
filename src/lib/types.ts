import type { Orientation, PaperSize, Writing } from './constants';

export type AnswerType = 'symbol' | 'word' | 'essay';

export const TYPE_LABEL: Record<AnswerType, string> = {
  symbol: '記号',
  word: '語句',
  essay: '記述',
};

export interface Question {
  id: string;
  major: string;
  sub: string;
  type: AnswerType;
  /** true なら種類を手動指定済み（模範解答が変わっても自動更新しない） */
  typeManual: boolean;
  answer: string;
  points: number;
  /** 指定すると、その字数のマス目の解答欄にする（未指定は自動サイズ） */
  grid?: number;
}

export interface TestMeta {
  title: string;
  hasClass: boolean;
  hasNumber: boolean;
  hasName: boolean;
  /** 解答用紙にも配点を表示する */
  showPointsOnSheet: boolean;
  paper: PaperSize;
  orientation: Orientation;
  /** 横書き / 縦書き（国語用。用紙全体を縦書きにする） */
  writing: Writing;
  fullScore: number;
}

export interface AppState {
  meta: TestMeta;
  questions: Question[];
}

export const DEFAULT_META: TestMeta = {
  title: '',
  hasClass: true,
  hasNumber: true,
  hasName: true,
  showPointsOnSheet: true,
  paper: 'A4',
  orientation: 'portrait',
  writing: 'horizontal',
  fullScore: 100,
};
