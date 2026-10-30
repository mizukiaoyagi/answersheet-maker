import { ActionIcon, Button, Checkbox, Group, NumberInput, Select, Text, Textarea, TextInput } from '@mantine/core';
import { memo } from 'react';
import { countChars, plainLength, suggestType } from '../lib/layout';
import { TYPE_LABEL, type AnswerType, type BoxSize, type Question } from '../lib/types';

const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as AnswerType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }));

export type DropPosition = 'before' | 'after';

interface Props {
  q: Question;
  /** 表の中での行番号（0 始まり） */
  index: number;
  dragging: boolean;
  /** 並べ替えのドロップ先として、この行の上側/下側に線を出す */
  dropPosition?: DropPosition;
  // 以下のハンドラは、行ごとに作り直さず、id を引数で受け取る。
  // そうすると、入力した行以外は、描き直さずに済む。
  onUpdate: (id: string, patch: Partial<Question>) => void;
  onAnswer: (id: string, answer: string) => void;
  onRemove: (id: string, button: HTMLElement) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>, id: string) => void;
  onDrop: (e: React.DragEvent<HTMLTableRowElement>) => void;
}

/** 設問の表の1行。memo化してあり、その行のデータが変わったときだけ描き直す */
export const QuestionRow = memo(function QuestionRow({
  q,
  index,
  dragging,
  dropPosition,
  onUpdate,
  onAnswer,
  onRemove,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  const no = `${index + 1}行目`;
  const setSize = (size: BoxSize | undefined) => onUpdate(q.id, { size });
  // 大きさを指定したマス目は、模範解答が入りきらないことがある（指定しないときは、答えの字数ぶん作る）
  const overflow = !!q.grid && !!q.size && plainLength(q.answer) > q.size.w * q.size.rows;
  const className = `q-row${dragging ? ' dragging' : ''}${dropPosition ? ` drop-${dropPosition}` : ''}`;

  return (
    <tr data-qid={q.id} className={className} onDragOver={(e) => onDragOver(e, q.id)} onDrop={onDrop}>
      <td>
        <div
          className="drag-handle"
          draggable
          role="img"
          aria-label={`${no}をドラッグして並べ替え`}
          title="つかんで上下に動かすと並べ替えできます"
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', q.id);
            const row = e.currentTarget.closest('tr');
            if (row) e.dataTransfer.setDragImage(row, 0, 0);
            onDragStart(q.id);
          }}
          onDragEnd={onDragEnd}
        >
          ⠿
        </div>
      </td>
      <td>
        <TextInput
          aria-label={`${no} 大問番号`}
          value={q.major}
          onChange={(e) => onUpdate(q.id, { major: e.currentTarget.value })}
        />
      </td>
      <td>
        <TextInput
          aria-label={`${no} 小問番号`}
          value={q.sub}
          onChange={(e) => onUpdate(q.id, { sub: e.currentTarget.value })}
        />
      </td>
      <td>
        <Select
          aria-label={`${no} 解答の種類`}
          allowDeselect={false}
          data={TYPE_OPTIONS}
          value={q.type}
          onChange={(v) => v && onUpdate(q.id, { type: v as AnswerType, typeManual: true })}
          comboboxProps={{ withinPortal: true }}
        />
        {q.typeManual && (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => onUpdate(q.id, { typeManual: false, type: suggestType(q.answer) })}
          >
            自動に戻す
          </Button>
        )}
      </td>
      <td>
        <Textarea
          aria-label={`${no} 模範解答`}
          autosize
          minRows={1}
          value={q.answer}
          onChange={(e) => onAnswer(q.id, e.currentTarget.value)}
        />
        <Text size="xs" c={overflow ? 'red.7' : 'gray.7'}>
          {countChars(q.answer)}字{overflow && '（マス目より長いです）'}
        </Text>
      </td>
      <td>
        {/* 大きさ（字数×行数。空なら模範解答の長さに合わせる）と、マス目にするか */}
        <Group gap={4} wrap="nowrap">
          <NumberInput
            aria-label={`${no} 欄の1行の字数`}
            placeholder="自動"
            min={1}
            max={100}
            allowDecimal={false}
            hideControls
            suffix="字"
            value={q.size?.w ?? ''}
            onChange={(v) => setSize(typeof v === 'number' && v > 0 ? { w: v, rows: q.size?.rows ?? 1 } : undefined)}
          />
          <NumberInput
            aria-label={`${no} 欄の行数`}
            placeholder="行"
            disabled={!q.size}
            min={1}
            max={20}
            allowDecimal={false}
            hideControls
            suffix="行"
            value={q.size?.rows ?? ''}
            onChange={(v) => q.size && setSize({ w: q.size.w, rows: typeof v === 'number' && v > 0 ? v : 1 })}
          />
        </Group>
        <Checkbox
          mt={4}
          variant="outline"
          size="xs"
          label="マス目"
          aria-label={`${no} マス目`}
          checked={!!q.grid}
          onChange={(e) => onUpdate(q.id, { grid: e.currentTarget.checked || undefined })}
        />
      </td>
      <td>
        <NumberInput
          aria-label={`${no} 配点`}
          min={0}
          step={1}
          decimalScale={1}
          hideControls
          value={q.points}
          onChange={(v) => onUpdate(q.id, { points: typeof v === 'number' ? v : 0 })}
        />
      </td>
      <td>
        <ActionIcon
          variant="subtle"
          color="gray"
          className="row-delete"
          size="lg"
          aria-label={`${no}を削除`}
          onClick={(e) => onRemove(q.id, e.currentTarget)}
        >
          ✕
        </ActionIcon>
      </td>
    </tr>
  );
});
