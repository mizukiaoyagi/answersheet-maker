import type { Orientation, PaperSize, Writing } from './constants';

export type AnswerType = 'symbol' | 'word' | 'essay';

export const TYPE_LABEL: Record<AnswerType, string> = {
  symbol: '記号',
  word: '語句',
  essay: '記述',
};

/** 解答欄の大きさ（字数×行数）。指定すると、答えの長さに関係なくこの大きさになる */
export interface BoxSize {
  /** 1行の字数 */
  w: number;
  /** 行数 */
  rows: number;
}

export interface Question {
  id: string;
  major: string;
  sub: string;
  type: AnswerType;
  /** true なら種類を手動指定済み（模範解答が変わっても自動更新しない） */
  typeManual: boolean;
  answer: string;
  points: number;
  /**
   * マス目の解答欄にする。大きさを指定したときは、その欄をマスで埋める。
   * 指定しないときは、模範解答の字数ちょうどのマスにする（欄の大きさもその字数で決まる）。
   */
  grid?: boolean;
  /** 指定すると、解答欄をこの大きさにする（未指定は、模範解答の長さに合わせた大きさ） */
  size?: BoxSize;
}

export interface TestMeta {
  title: string;
  hasClass: boolean;
  hasNumber: boolean;
  hasName: boolean;
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
  paper: 'A4',
  orientation: 'portrait',
  writing: 'horizontal',
  fullScore: 100,
};
