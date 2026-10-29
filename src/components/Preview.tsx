import { Alert, Tabs } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useMemo, useState } from 'react';
import { paperDims } from '../lib/constants';
import { buildLayout, type Mode } from '../lib/layout';
import type { Question, TestMeta } from '../lib/types';
import { Sheet } from './Sheet';

const MM_TO_PX = 96 / 25.4;
/** 用紙と用紙の間隔（表示上） */
const PAGE_GAP_PX = 16;
const MAX_SCALE = 1.25;

/** 右側のプレビュー: 「解答用紙」「模範解答」のタブと、用紙を縦に並べた表示 */
export function Preview({ meta, questions }: { meta: TestMeta; questions: Question[] }) {
  const [mode, setMode] = useState<Mode>('sheet');
  const layout = useMemo(() => buildLayout(meta, questions), [meta, questions]);

  const paper = paperDims(meta.paper, meta.orientation);
  const { ref, width } = useElementSize();
  const pxW = paper.w * MM_TO_PX;
  const pxH = (paper.h - 1) * MM_TO_PX;
  const scale = width > 0 ? Math.min(MAX_SCALE, width / pxW) : 0.5;
  const pages = layout.pages.length;

  return (
    <section className="preview panel">
      <div className="no-print">
        <Tabs value={mode} onChange={(v) => v && setMode(v as Mode)}>
          <Tabs.List>
            <Tabs.Tab value="sheet">解答用紙</Tabs.Tab>
            <Tabs.Tab value="model">模範解答</Tabs.Tab>
          </Tabs.List>
        </Tabs>
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
