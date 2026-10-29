import { ActionIcon, Alert, Button, Group, Tabs } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useDeferredValue, useMemo, useState } from 'react';
import { paperDims } from '../lib/constants';
import { buildLayout, type Mode } from '../lib/layout';
import type { Question, TestMeta } from '../lib/types';
import { Sheet } from './Sheet';

const MM_TO_PX = 96 / 25.4;
/** 用紙と用紙の間隔（表示上） */
const PAGE_GAP_PX = 16;
/** 「幅に合わせる」ときの、拡大の上限 */
const MAX_FIT_SCALE = 1.25;
/** ボタン1回あたりの拡大・縮小の倍率 */
const ZOOM_STEP = 1.25;
/** 幅に合わせた大きさを 1 としたときの、拡大・縮小の範囲 */
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 4;

/** 拡大・縮小を適用した倍率（幅に合わせた大きさ × zoom）。範囲の外に出ないようにする */
export function zoomed(zoom: number, step: 1 | -1): number {
  const next = step > 0 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 1000) / 1000));
}

/** 右側のプレビュー: 「解答用紙」「模範解答」のタブと、用紙を縦に並べた表示 */
export function Preview({ meta: liveMeta, questions: liveQuestions }: { meta: TestMeta; questions: Question[] }) {
  const [mode, setMode] = useState<Mode>('sheet');
  /** 1 = プレビューの幅に合わせた大きさ */
  const [zoom, setZoom] = useState(1);
  // 入力欄の操作を優先し、プレビューの描き直しは、少し遅れてよい（入力のたびに止まらないように）
  const meta = useDeferredValue(liveMeta);
  const questions = useDeferredValue(liveQuestions);
  const layout = useMemo(() => buildLayout(meta, questions), [meta, questions]);

  const paper = paperDims(meta.paper, meta.orientation);
  const { ref, width } = useElementSize();
  const pxW = paper.w * MM_TO_PX;
  const pxH = (paper.h - 1) * MM_TO_PX;
  const fitScale = width > 0 ? Math.min(MAX_FIT_SCALE, width / pxW) : 0.5;
  const scale = fitScale * zoom;
  const pages = layout.pages.length;

  return (
    <section className="preview">
      <div className="no-print">
        <div className="preview-head">
          <Tabs value={mode} onChange={(v) => v && setMode(v as Mode)} style={{ flex: 1 }}>
            <Tabs.List>
              <Tabs.Tab value="sheet">解答用紙</Tabs.Tab>
              <Tabs.Tab value="model">模範解答</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Group gap={4} wrap="nowrap" className="zoom-controls">
            <ActionIcon
              variant="default"
              aria-label="縮小"
              title="縮小"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((z) => zoomed(z, -1))}
            >
              －
            </ActionIcon>
            <Button
              variant="default"
              size="compact-sm"
              title="プレビューの幅に合わせる"
              aria-label="プレビューの幅に合わせる"
              onClick={() => setZoom(1)}
              style={{ minWidth: 56 }}
            >
              {Math.round(scale * 100)}%
            </Button>
            <ActionIcon
              variant="default"
              aria-label="拡大"
              title="拡大"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((z) => zoomed(z, 1))}
            >
              ＋
            </ActionIcon>
          </Group>
        </div>
        {!layout.fits && (
          <Alert color="red" mt="xs" p="xs">
            1ページに収まらない欄があります。記述の模範解答を短くするか、用紙を大きく・横向きにしてください。
          </Alert>
        )}
      </div>
      <div className="preview-area">
        {/* 幅を測る要素は、余白（padding）のない内側に付ける */}
        <div ref={ref}>
          <div
            className="scale-wrap"
            style={{ width: pxW * scale, height: (pxH * pages + PAGE_GAP_PX * (pages - 1)) * scale }}
          >
            <div className="sheet-scale" style={{ transform: `scale(${scale})`, gap: PAGE_GAP_PX }}>
              {layout.pages.map((page, i) => (
                <Sheet key={i} page={page} meta={meta} mode={mode} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
