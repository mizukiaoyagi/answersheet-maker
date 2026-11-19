import { Button, Group, Menu } from '@mantine/core';
import { useEffect, useState } from 'react';
import { downloadXlsx } from '../lib/excel';
import type { Mode } from '../lib/layout';
import { downloadPdf } from '../lib/pdfExport';
import type { Question, TestMeta } from '../lib/types';

/** 上部バー: ツール名、Excel 保存、PDF 保存、印刷 */
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

  const [pdfBusy, setPdfBusy] = useState(false);
  const savePdf = async (mode: Mode) => {
    setPdfBusy(true);
    try {
      await downloadPdf(meta, questions, mode);
    } catch (e) {
      window.alert(
        `PDFの作成に失敗しました: ${e instanceof Error ? e.message : String(e)}\n「印刷」から、送信先を「PDFに保存」にして保存してください。`,
      );
    } finally {
      setPdfBusy(false);
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
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <Button variant="outline" loading={pdfBusy}>
              PDFで保存
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => savePdf('sheet')}>解答用紙</Menu.Item>
            <Menu.Item onClick={() => savePdf('model')}>模範解答</Menu.Item>
          </Menu.Dropdown>
        </Menu>
        <Button variant="outline" onClick={() => window.print()}>
          印刷
        </Button>
      </Group>
    </header>
  );
}
