import { memo } from 'react';
import { Checkbox, Group, SegmentedControl, Text, TextInput } from '@mantine/core';
import { HoldNumberInput } from './HoldNumberInput';
import type { Orientation, PaperSize, Writing } from '../lib/constants';
import type { TestMeta } from '../lib/types';

/** チェックボックスは、塗りつぶさず、枠とチェックだけの控えめな見た目にする */
const CHECK_PROPS = { variant: 'outline', size: 'sm' } as const;

/** 項目名つきの入力部品 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Text size="sm" fw={500} mb={4}>
        {label}
      </Text>
      {children}
    </div>
  );
}

/** テスト情報（タイトル、満点、用紙、記入欄）のフォーム */
export const MetaForm = memo(function MetaForm({
  meta,
  onChange,
}: {
  meta: TestMeta;
  onChange: (patch: Partial<TestMeta>) => void;
}) {
  return (
    <div className="panel">
      <Group grow align="flex-start" mb="xs">
        <TextInput
          label="タイトル"
          placeholder="例：物理 中間考査"
          value={meta.title}
          onChange={(e) => onChange({ title: e.currentTarget.value })}
        />
      </Group>
      {/* 満点の横に、記入欄のチェックを一列に並べる（下ぞろえ） */}
      <Group align="flex-end" gap="lg" mb="sm">
        <HoldNumberInput label="満点" width={120} value={meta.fullScore} onChange={(v) => onChange({ fullScore: v })} />
        <Field label="記入欄">
          <Group gap="md" h={36} wrap="nowrap">
            <Checkbox {...CHECK_PROPS} label="組" checked={meta.hasClass} onChange={(e) => onChange({ hasClass: e.currentTarget.checked })} />
            <Checkbox {...CHECK_PROPS}
              label="番号"
              checked={meta.hasNumber}
              onChange={(e) => onChange({ hasNumber: e.currentTarget.checked })}
            />
            <Checkbox {...CHECK_PROPS} label="氏名" checked={meta.hasName} onChange={(e) => onChange({ hasName: e.currentTarget.checked })} />
          </Group>
        </Field>
      </Group>
      <Group align="center" gap="lg">
        <Field label="用紙サイズ">
          <SegmentedControl value={meta.paper} onChange={(v) => onChange({ paper: v as PaperSize })} data={['A4', 'B4']} />
        </Field>
        <Field label="向き">
          <SegmentedControl
            value={meta.orientation}
            onChange={(v) => onChange({ orientation: v as Orientation })}
            data={[
              { value: 'portrait', label: '縦' },
              { value: 'landscape', label: '横' },
            ]}
          />
        </Field>
        <Field label="書き方">
          <SegmentedControl
            value={meta.writing}
            onChange={(v) => onChange({ writing: v as Writing })}
            data={[
              { value: 'horizontal', label: '横書き' },
              { value: 'vertical', label: '縦書き' },
            ]}
          />
        </Field>
      </Group>
    </div>
  );
});
