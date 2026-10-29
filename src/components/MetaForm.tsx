import { Checkbox, Group, NumberInput, SegmentedControl, Text, TextInput } from '@mantine/core';
import type { Orientation, PaperSize, Writing } from '../lib/constants';
import type { TestMeta } from '../lib/types';

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
export function MetaForm({ meta, onChange }: { meta: TestMeta; onChange: (patch: Partial<TestMeta>) => void }) {
  return (
    <div className="panel">
      <Text fw={700} mb="xs">
        テスト情報
      </Text>
      <Group grow align="flex-start" mb="xs">
        <TextInput
          label="タイトル"
          placeholder="例：理科 小テスト"
          value={meta.title}
          onChange={(e) => onChange({ title: e.currentTarget.value })}
        />
      </Group>
      <Group grow align="flex-start" mb="xs">
        <NumberInput
          label="満点"
          min={0}
          allowDecimal={false}
          value={meta.fullScore}
          onChange={(v) => onChange({ fullScore: typeof v === 'number' ? v : 0 })}
        />
      </Group>
      <Group align="flex-end" gap="lg">
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
        <Field label="記入欄">
          <Group gap="md">
            <Checkbox label="組" checked={meta.hasClass} onChange={(e) => onChange({ hasClass: e.currentTarget.checked })} />
            <Checkbox
              label="番号"
              checked={meta.hasNumber}
              onChange={(e) => onChange({ hasNumber: e.currentTarget.checked })}
            />
            <Checkbox label="氏名" checked={meta.hasName} onChange={(e) => onChange({ hasName: e.currentTarget.checked })} />
          </Group>
        </Field>
        <Checkbox
          label="解答用紙にも配点を表示"
          checked={meta.showPointsOnSheet}
          onChange={(e) => onChange({ showPointsOnSheet: e.currentTarget.checked })}
        />
      </Group>
    </div>
  );
}
