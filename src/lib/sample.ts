import { newId } from './id';
import { suggestType } from './layout';
import type { AppState, BoxSize, Question } from './types';

type Row = [major: string, sub: string, answer: string, points: number, grid?: boolean, size?: BoxSize];

/** 用紙・書き方ごとに1つ */
export type SampleKind = 'math' | 'japanese' | 'social' | 'kanji';

/** 漢字の欄は、答えの長さに関係なく、すべて同じ大きさ（字数×1行）にする。答えは4字以内 */
/** 漢字の読み10問・書き10問 */
const KANJI_ANSWERS = [
  'おだやか',
  'さかい',
  'してき',
  'やしなう',
  'きちょう',
  'かんけつ',
  'まねく',
  'つとめる',
  'ちぢむ',
  'たがいに',
  '幼稚',
  '豊か',
  '耕す',
  '収穫',
  '提案',
  '興味',
  '産業',
  '解剖',
  '険しい',
  '承る',
];
const kanjiRows = (points: number, major: string, w: number): Row[] =>
  KANJI_ANSWERS.map((answer, i): Row => [major, String(i + 1), answer, points, undefined, { w, rows: 1 }]);

/**
 * 数学・A4縦の横書きで、2枚にわたるサンプル。
 * 計算と方程式は、答えの長さが違っても欄の大きさをそろえている。
 * いちばん下の大問7は、作図をするための大きな枠。
 */
const CALC_BOX: BoxSize = { w: 4, rows: 1 };
const EQUATION_BOX: BoxSize = { w: 7, rows: 1 };
/** 作図の枠の高さ（行数）。2枚目の下の余白まで届く大きさ */
const DRAWING_ROWS = 16;
const math: Row[] = [
  ...['-3', '12', '7/6', '-8x', '2√3', 'x²-9', '5', '0.2', '-1/2', '4a'].map(
    (a, i): Row => ['1', String(i + 1), a, 2, undefined, CALC_BOX],
  ),
  ...['x=4', 'x=-2', 'x=3', 'x<5', 'y=2x+1', 'x=±3', 'x=2,y=1', 'a=-4'].map(
    (a, i): Row => ['2', String(i + 1), a, 2, undefined, EQUATION_BOX],
  ),
  ['3', '1', 'y=3x-2', 3],
  ['3', '2', '(2, 4)', 3],
  ['3', '3', '12cm²', 3],
  ['3', '4', 'ウ', 3],
  ['3', '5', 'xが1増えるとyが3増えるので、変化の割合は3である。', 4],
  ['4', '1', '8', 2],
  ['4', '2', '7.5', 2],
  ['4', '3', 'ウ', 2],
  ['4', '4', 'どちらの階級にも同じ人数が入るので、中央値は6.5になる。', 4],
  ['5', '1', '1/6', 2],
  ['5', '2', '5/12', 2],
  ['5', '3', 'ウ', 2],
  ['5', '4', 'すべての場合は36通りで、条件に合う場合は6通りだから、確率は1/6である。', 3],
  ['6', '1', '45°', 3],
  ['6', '2', '6π', 3],
  ['6', '3', 'イ', 3],
  ['6', '4', '三角形の内角の和は180°だから、残りの角は45°になる。', 4],
  ['6', '5', '平行四辺形の対角線はそれぞれの中点で交わるから、△ABEと△CDEは合同になる。', 5, true],
  ['6', '6', '二等辺三角形の底角は等しいから、∠ABC=∠ACBとなり、△ABCは二等辺三角形である。', 5, true],
  ['7', '1', '図のとおり', 6, undefined, { w: 15, rows: DRAWING_ROWS }],
];

/**
 * 社会（歴史）・B4縦の横書きサンプル。
 * 大問4の(7)にマス目を指定している。
 */
const history: Row[] = [
  ['1', '1', '卑弥呼', 2],
  ['1', '2', '邪馬台国', 2],
  ['1', '3', '聖徳太子', 2],
  ['1', '4', '冠位十二階', 2],
  ['1', '5', '大化の改新', 2],
  ['1', '6', '中大兄皇子', 2],
  ['2', '1', '平城京', 2],
  ['2', '2', '墾田永年私財法', 2],
  ['2', '3', '桓武天皇', 2],
  ['2', '4', '藤原道長', 2],
  ['2', '5', '摂関政治', 2],
  ['2', '6', '紫式部', 2],
  ['3', '1', '遣唐使を停止し、唐の文化を踏まえながら日本の風土や生活に合った国風文化が栄えた。', 7],
  ['3', '2', '土地を開墾した者に私有を認めたため、貴族や寺社が開墾を進め、公地公民の原則がくずれた。', 7],
  ['3', '3', '天皇が幼いときは摂政、成人後は関白となって政治の実権を握る、摂関政治を行った。', 7],
  ['3', '4', '白河上皇が天皇の位をゆずったのちも上皇として政治を行う、院政を始めた。', 7],
  ['4', '1', '源頼朝', 2],
  ['4', '2', '守護', 2],
  ['4', '3', '地頭', 2],
  ['4', '4', '御恩と奉公', 2],
  ['4', '5', '執権', 2],
  ['4', '6', '承久の乱', 2],
  ['4', '7', '将軍は御家人に領地を保障し、御家人は戦いのときに将軍のために命がけで戦った。', 9, true],
  ['4', '8', '元軍は集団戦法や火薬を使った兵器で御家人を苦しめたが、暴風雨もあり撤退した。', 9],
  ['5', '1', '足利義満', 2],
  ['5', '2', '応仁の乱', 2],
  ['5', '3', '下剋上', 2],
  ['5', '4', 'ア', 2],
  ['5', '5', '室町幕府は有力な守護大名の力に支えられており、将軍の権力は安定しなかったから。', 5],
  ['5', '6', '戦国大名は領国を支配するため分国法を定め、城下町をつくって家臣を集めた。', 5],
];

/**
 * 国語・B4横の縦書きサンプル。
 * 大問1は漢字20問（欄の大きさをすべて同じに指定）。そのあとに記号、抜き出し、記述（マス目つき）が入っている。
 */
const japanese: Row[] = [
  ...kanjiRows(1, '1', 4),
  ['2', '1', '自然環境', 4],
  ['2', '2', 'ウ', 4],
  ['2', '3', 'イ', 4],
  ['2', '4', '筆者は、人間の活動が自然に与える影響を理解したうえで、自然との共存を考えるべきだと述べている。', 10],
  ['2', '5', '具体的な事例を挙げて説明することで、読み手が筆者の主張を身近な問題として捉えられるようにしている。', 10],
  ['3', '1', 'ア', 4],
  ['3', '2', '不安', 4],
  ['3', '3', '「僕」は、友人の言葉をきっかけに、自分の弱さを認めて前に進もうと決意したから。', 10, true],
  ['3', '4', '夕焼けの情景が、「僕」の晴れやかな気持ちを暗示している。', 10],
  ['4', '1', '春はあけぼの', 4],
  ['4', '2', 'エ', 4],
  ['4', '3', '清少納言は、移り変わる季節の中で最も美しいと感じる時間帯を、自分の感性で選び取っている。', 12, true],
];

const SAMPLES: Record<
  SampleKind,
  {
    /** 「サンプルを読み込む」の項目名 */
    label: string;
    rows: Row[];
    meta: Pick<AppState['meta'], 'title' | 'paper' | 'orientation' | 'writing'>;
  }
> = {
  math: {
    label: 'A4数学（横書き）',
    rows: math,
    meta: { title: '数学中間考査', paper: 'A4', orientation: 'portrait', writing: 'horizontal' },
  },
  japanese: {
    label: 'B4国語（縦書き）',
    rows: japanese,
    meta: { title: '国語中間考査', paper: 'B4', orientation: 'landscape', writing: 'vertical' },
  },
  social: {
    label: 'B4社会（横書き）',
    rows: history,
    meta: { title: '社会期末考査', paper: 'B4', orientation: 'portrait', writing: 'horizontal' },
  },
  kanji: {
    label: 'B5漢字（縦書き）',
    // 小テストなので、大問番号は付けない（「(1)」〜「(20)」だけ）。欄は6字ぶん
    rows: kanjiRows(5, '', 6),
    meta: { title: '漢字小テスト', paper: 'B5', orientation: 'landscape', writing: 'vertical' },
  },
};

/** 「サンプルを読み込む」に並べる項目 */
export const SAMPLE_LIST: { kind: SampleKind; label: string }[] = (['math', 'japanese', 'social', 'kanji'] as const).map(
  (kind) => ({ kind, label: SAMPLES[kind].label }),
);

export function sampleState(kind: SampleKind = 'math'): AppState {
  const { rows, meta } = SAMPLES[kind];
  const questions: Question[] = rows.map(([major, sub, answer, points, grid, size]) => ({
    id: newId(),
    major,
    sub,
    answer,
    points,
    ...(grid ? { grid: true } : {}),
    ...(size ? { size: { ...size } } : {}),
    type: suggestType(answer),
    typeManual: false,
  }));
  return {
    meta: {
      hasClass: true,
      hasNumber: true,
      hasName: true,
      fullScore: 100,
      ...meta,
    },
    questions,
  };
}
