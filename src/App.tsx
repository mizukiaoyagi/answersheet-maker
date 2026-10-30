import { useMediaQuery } from '@mantine/hooks';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { MetaForm } from './components/MetaForm';
import { Preview } from './components/Preview';
import { QuestionTable } from './components/QuestionTable';
import { TopBar } from './components/TopBar';
import { useAppState } from './hooks/useAppState';
import type { Mode } from './lib/layout';
import { loadPaneLayout, RATIO_MAX, RATIO_MIN, savePaneLayout } from './lib/storage';

/**
 * 入力とプレビューを左右に並べられる、画面の幅（px）。パソコンの画面ならふつうは並ぶ。
 * これより狭い（タブレット・スマートフォン）ときは、プレビューを右から重ねて出す。
 */
const SPLIT_MIN_WIDTH = 1000;
/** 左右に並べたときの、入力側とプレビュー側の最小の幅（px） */
const EDITOR_MIN_PX = 480;
const PREVIEW_MIN_PX = 380;
/** 境目をキーボードで動かすときの、1回の割合 */
const RATIO_STEP = 0.02;

const clampRatio = (r: number) => Math.min(RATIO_MAX, Math.max(RATIO_MIN, r));

export function App() {
  const { state, setMeta, updateQuestion, setAnswer, removeQuestion, move, addQuestion, loadSample, clearAll } =
    useAppState();
  const { meta, questions } = state;

  const split = useMediaQuery(`(min-width: ${SPLIT_MIN_WIDTH}px)`, false, { getInitialValueInEffect: false });
  const [saved] = useState(loadPaneLayout);
  // 左右に並べるときの開閉は覚えておく。狭いときに重ねて出すプレビューは、いつも閉じて始める
  const [openSplit, setOpenSplit] = useState(saved.open);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [ratio, setRatio] = useState(saved.ratio);
  const [mode, setMode] = useState<Mode>('sheet');
  const open = split ? openSplit : openDrawer;
  const setOpen = split ? setOpenSplit : setOpenDrawer;

  useEffect(() => {
    savePaneLayout({ open: openSplit, ratio });
  }, [openSplit, ratio]);

  // 重ねて出しているプレビューは、Esc で閉じる
  useEffect(() => {
    if (split || !openDrawer) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpenDrawer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [split, openDrawer]);

  // 印刷の直前は、見えていなくても、プレビューを最新にして出す
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  // 境目のドラッグ: 入力側の幅を、内容の幅に対する割合で決める
  const mainRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragTo = (clientX: number) => {
    const el = mainRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    setRatio(clampRatio((clientX - rect.left - pad) / (rect.width - pad * 2)));
  };

  const showSplit = split && openSplit;

  return (
    <div className="app">
      {/* 印刷時の用紙サイズと向き */}
      <style>{`@page { size: ${meta.paper} ${meta.orientation}; margin: 0; }`}</style>

      <TopBar meta={meta} questions={questions} previewOpen={open} onTogglePreview={() => setOpen(!open)} />

      <div
        ref={mainRef}
        className={`main${split ? ' split' : ''}`}
        style={
          split
            ? {
                // プレビューを閉じたら、入力が画面いっぱいになる。
                // fr の合計が 1 未満だと、片方が最小幅で止まったとき、もう片方が残りを使い切れず余白ができる。
                // そのため、合計が 100 になる値にする
                gridTemplateColumns: showSplit
                  ? `minmax(${EDITOR_MIN_PX}px, ${ratio * 100}fr) 16px minmax(${PREVIEW_MIN_PX}px, ${(1 - ratio) * 100}fr)`
                  : 'minmax(0, 1fr)',
              }
            : undefined
        }
      >
        <section className="editor no-print">
          <MetaForm meta={meta} onChange={setMeta} />
          <QuestionTable
            questions={questions}
            fullScore={meta.fullScore}
            onUpdate={updateQuestion}
            onAnswer={setAnswer}
            onRemove={removeQuestion}
            onMove={move}
            onAdd={addQuestion}
            onLoadSample={loadSample}
            onClear={clearAll}
          />
        </section>

        {showSplit && (
          <div
            className="splitter no-print"
            role="separator"
            aria-orientation="vertical"
            aria-label="入力とプレビューの幅（左右の矢印キーで動かせます。ダブルクリックで元に戻します）"
            tabIndex={0}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragging.current = true;
            }}
            onPointerMove={(e) => dragging.current && dragTo(e.clientX)}
            onPointerUp={() => (dragging.current = false)}
            onPointerCancel={() => (dragging.current = false)}
            onDoubleClick={() => setRatio(0.5)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setRatio((r) => clampRatio(r - RATIO_STEP));
              if (e.key === 'ArrowRight') setRatio((r) => clampRatio(r + RATIO_STEP));
            }}
          />
        )}

        <Preview
          meta={meta}
          questions={questions}
          mode={mode}
          onModeChange={setMode}
          drawer={!split}
          hidden={!open && !printing}
          onClose={() => setOpen(false)}
        />
      </div>
    </div>
  );
}
