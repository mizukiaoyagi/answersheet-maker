import { ActionIcon, Button, NumberInput, Select, Text, Textarea, TextInput } from '@mantine/core';
import { countChars, gridCount, suggestType } from '../lib/layout';
import { TYPE_LABEL, type AnswerType, type Question } from '../lib/types';

const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as AnswerType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }));

/** 改行を除いた文字数（マス目に入れる文字数） */
const plainLength = (s: string) => [...s.replace(/[\r\n]/g, '')].length;

interface Props {
  q: Question;
  /** 表の中での行番号（0 始まり） */
  index: number;
  className: string;
  onUpdate: (patch: Partial<Question>) => void;
  onAnswer: (answer: string) => void;
  onRemove: (button: HTMLElement) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent<HTMLTableRowElement>) => void;
  onDrop: (e: React.DragEvent<HTMLTableRowElement>) => void;
}

/** 設問の表の1行 */
export function QuestionRow({
  q,
  index,
  className,
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

  return (
    <tr data-qid={q.id} className={className} onDragOver={onDragOver} onDrop={onDrop}>
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
            onDragStart();
          }}
          onDragEnd={onDragEnd}
        >
          ⠿
        </div>
      </td>
      <td>
        <TextInput aria-label={`${no} 大問番号`} value={q.major} onChange={(e) => onUpdate({ major: e.currentTarget.value })} />
      </td>
      <td>
        <TextInput aria-label={`${no} 小問番号`} value={q.sub} onChange={(e) => onUpdate({ sub: e.currentTarget.value })} />
      </td>
      <td>
        <Select
          aria-label={`${no} 解答の種類`}
          allowDeselect={false}
          data={TYPE_OPTIONS}
          value={q.type}
          onChange={(v) => v && onUpdate({ type: v as AnswerType, typeManual: true })}
          comboboxProps={{ withinPortal: true }}
        />
        {q.typeManual && (
          <Button
            size="compact-xs"
            variant="subtle"
            onClick={() => onUpdate({ typeManual: false, type: suggestType(q.answer) })}
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
          onChange={(e) => onAnswer(e.currentTarget.value)}
        />
        <Text size="xs" c={overflow ? 'red' : 'dimmed'}>
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
          onChange={(v) => onUpdate({ grid: typeof v === 'number' && v > 0 ? v : undefined })}
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
          onChange={(v) => onUpdate({ points: typeof v === 'number' ? v : 0 })}
        />
      </td>
      <td>
        <ActionIcon
          variant="light"
          color="red"
          size="lg"
          aria-label={`${no}を削除`}
          onClick={(e) => onRemove(e.currentTarget)}
        >
          ✕
        </ActionIcon>
      </td>
    </tr>
  );
}
