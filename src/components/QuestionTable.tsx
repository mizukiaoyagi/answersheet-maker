import { Alert, Button, Group, Menu, Text } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { totalPoints } from '../lib/layout';
import type { SampleKind } from '../lib/sample';
import type { Question } from '../lib/types';
import { QuestionRow } from './QuestionRow';

interface Props {
  questions: Question[];
  fullScore: number;
  onUpdate: (id: string, patch: Partial<Question>) => void;
  onAnswer: (id: string, answer: string) => void;
  onRemove: (id: string) => void;
  onMove: (fromId: string, targetId: string, after: boolean) => void;
  /** 設問を足して、その id を返す */
  onAdd: () => string;
  onLoadSample: (kind: SampleKind) => void;
  onClear: () => void;
}

/** 設問のパネル: サンプル読み込み、設問の表（並べ替え・削除）、追加、配点の合計 */
export function QuestionTable({
  questions,
  fullScore,
  onUpdate,
  onAnswer,
  onRemove,
  onMove,
  onAdd,
  onLoadSample,
  onClear,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  /** ドロップ先の行と、その行の上側/下側のどちらに入れるか */
  const [drop, setDrop] = useState<{ id: string; after: boolean } | null>(null);
  const endDrag = () => {
    setDragId(null);
    setDrop(null);
  };

  // 追加した行が見える位置までスクロールして、模範解答の欄にカーソルを置く
  const addedId = useRef<string | null>(null);
  useEffect(() => {
    const id = addedId.current;
    if (!id) return;
    addedId.current = null;
    const row = document.querySelector<HTMLElement>(`[data-qid="${id}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
  }, [questions]);

  // 行を消してページが短くなると、ページの下端にいるときスクロール位置がずれる。
  // 消した直後は入力欄の高さを保ち、次にスクロール操作をするまで位置が動かないようにする
  const remove = (id: string, button: HTMLElement) => {
    const editor = button.closest<HTMLElement>('.editor');
    if (editor) {
      editor.style.minHeight = `${editor.offsetHeight}px`;
      const release = () => {
        editor.style.minHeight = '';
      };
      for (const type of ['wheel', 'touchmove', 'keydown'] as const)
        window.addEventListener(type, release, { once: true, passive: true });
    }
    onRemove(id);
  };

  const loadSample = (kind: SampleKind) => {
    if (questions.length && !window.confirm('現在の入力内容をサンプルで置き換えます。よろしいですか？')) return;
    onLoadSample(kind);
  };
  const clear = () => {
    if (!window.confirm('入力内容をすべて消します。よろしいですか？')) return;
    onClear();
  };

  const total = totalPoints(questions);
  const scoreOk = total === fullScore;

  return (
    <div className="panel">
      <Group justify="space-between" mb="xs">
        <Text fw={700}>設問</Text>
        <Group gap="xs">
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Button size="xs" variant="default">
                サンプルを読み込む ▾
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => loadSample('one')}>1枚のサンプル（理科）</Menu.Item>
              <Menu.Item onClick={() => loadSample('two')}>2枚のサンプル（社会）</Menu.Item>
              <Menu.Item onClick={() => loadSample('vertical')}>縦書きのサンプル（国語・B4横）</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button size="xs" variant="outline" color="red" onClick={clear}>
            入力内容を消す
          </Button>
        </Group>
      </Group>

      <div className="table-scroll">
        <table className="q-table">
          <colgroup>
            <col style={{ width: 36 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 64 }} />
            <col style={{ width: 104 }} />
            <col />
            <col style={{ width: 84 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 52 }} />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>大問</th>
              <th>小問</th>
              <th>種類</th>
              <th>模範解答</th>
              <th>マス目</th>
              <th>配点</th>
              <th>削除</th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <Text c="dimmed" size="sm" py="md" ta="center">
                    設問がありません。下の「設問を追加」か「サンプルを読み込む」を押してください。
                  </Text>
                </td>
              </tr>
            )}
            {questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                q={q}
                index={i}
                className={`q-row${dragId === q.id ? ' dragging' : ''}${
                  drop?.id === q.id && dragId !== q.id ? (drop.after ? ' drop-after' : ' drop-before') : ''
                }`}
                onUpdate={(patch) => onUpdate(q.id, patch)}
                onAnswer={(answer) => onAnswer(q.id, answer)}
                onRemove={(button) => remove(q.id, button)}
                onDragStart={() => setDragId(q.id)}
                onDragEnd={endDrag}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const after = e.clientY > r.top + r.height / 2;
                  if (drop?.id !== q.id || drop.after !== after) setDrop({ id: q.id, after });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && drop) onMove(dragId, drop.id, drop.after);
                  endDrag();
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Button
        mt="sm"
        fullWidth
        size="md"
        variant="light"
        onClick={() => {
          addedId.current = onAdd();
        }}
      >
        ＋ 設問を追加
      </Button>
      <Text mt="sm" ta="right" fw={700} c={scoreOk ? undefined : 'red'}>
        配点合計：{total}点 ／ 満点 {fullScore}点
      </Text>
      {!scoreOk && (
        <Alert color="orange" mt="xs" p="xs">
          配点の合計（{total}点）が満点（{fullScore}点）と一致していません。
        </Alert>
      )}
    </div>
  );
}
