import { Button, Group } from '@mantine/core';
import { useState } from 'react';
import { downloadXlsx } from '../lib/excel';
import type { Question, TestMeta } from '../lib/types';

/** 上部バー: ツール名、Excel 保存、印刷 */
export function TopBar({ meta, questions }: { meta: TestMeta; questions: Question[] }) {
  const [exporting, setExporting] = useState(false);

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
    <header className="topbar no-print">
      <h1>解答用紙メーカー</h1>
      <Group gap="xs">
        <Button onClick={saveExcel} loading={exporting}>
          Excelで保存
        </Button>
        <Button variant="light" onClick={() => window.print()}>
          印刷・PDF
        </Button>
      </Group>
    </header>
  );
}
