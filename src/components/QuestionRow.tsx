import { ActionIcon, Button, NumberInput, Select, Text, Textarea, TextInput } from '@mantine/core';
import { memo } from 'react';
import { countChars, gridCount, suggestType } from '../lib/layout';
import { TYPE_LABEL, type AnswerType, type Question } from '../lib/types';

const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as AnswerType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }));

/** 改行を除いた文字数（マス目に入れる文字数） */
const plainLength = (s: string) => [...s.replace(/[\r\n]/g, '')].length;

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
  const overflow = gridCount(q) > 0 && plainLength(q.answer) > gridCount(q);
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
          maxRows={6}
          value={q.answer}
          onChange={(e) => onAnswer(q.id, e.currentTarget.value)}
        />
        <Text size="xs" c={overflow ? 'red.7' : 'gray.7'}>
          {countChars(q.answer)}字{overflow && '（マス目より長いです）'}
        </Text>
      </td>
      <td>
        <NumberInput
          aria-label={`${no} マス目の字数`}
          placeholder="なし"
          min={0}
          max={200}
          allowDecimal={false}
          hideControls
          suffix="字"
          value={q.grid ?? ''}
          onChange={(v) => onUpdate(q.id, { grid: typeof v === 'number' && v > 0 ? v : undefined })}
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
