import { Button, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { downloadXlsx } from '../lib/excel';
import type { Question, TestMeta } from '../lib/types';

/** 上部バー: ツール名、Excel 保存、印刷 */
export function TopBar({
  meta,
  questions,
  previewOpen,
  onTogglePreview,
}: {
  meta: TestMeta;
  questions: Question[];
  previewOpen: boolean;
  onTogglePreview: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  // ページをスクロールしたら、背景を少し透かす
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const saveExcel = async () => {
    setExporting(true);
    try {
      await downloadXlsx(meta, questions);
    } catch (e) {
      window.alert(`Excelの作成に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className={`topbar no-print${scrolled ? ' scrolled' : ''}`}>
      <h1>解答用紙メーカー</h1>
      <Group gap="xs">
        <Button variant="default" onClick={onTogglePreview} aria-pressed={previewOpen}>
          {previewOpen ? 'プレビューを閉じる' : 'プレビューを開く'}
        </Button>
        <Button onClick={saveExcel} loading={exporting}>
          Excelで保存
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          印刷・PDF
        </Button>
      </Group>
    </header>
  );
}
