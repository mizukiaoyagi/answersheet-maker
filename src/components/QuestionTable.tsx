import { Alert, Button, Group, Menu, Text } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { totalPoints } from '../lib/layout';
import { SAMPLE_LIST, type SampleKind } from '../lib/sample';
import type { Question } from '../lib/types';
import { QuestionRow } from './QuestionRow';

/** 矢印キーで行き来する欄（QuestionRow の data-nav と同じ名前）。左右はこの順に動く */
const NAV_COLS = ['major', 'sub', 'type', 'answer', 'w', 'rows', 'points'];

type Field = HTMLInputElement | HTMLTextAreaElement;

const findField = (row: Element, col: string) => {
  const el = row.querySelector<Field>(`[data-nav="${col}"]`);
  return el && !el.disabled ? el : null;
};

/** 移動先の欄にカーソルを置く。all は全選択（そのまま打ち直せる）、start/end は端 */
const focusField = (el: Field, caret: 'all' | 'start' | 'end') => {
  el.focus();
  try {
    if (caret === 'all') el.select();
    else el.setSelectionRange(caret === 'start' ? 0 : el.value.length, caret === 'start' ? 0 : el.value.length);
  } catch {
    // 選択できない欄は、フォーカスだけ移す
  }
};

/**
 * 入力欄のキー操作: Enter で1つ下の欄へ、矢印キーでその向きの隣の欄へ。
 * 文字の編集を邪魔しないよう、左右はカーソルが端にあるときだけ、複数行の欄の上下は先頭/末尾にあるときだけ動く。
 */
const onNavKey = (e: React.KeyboardEvent<HTMLElement>) => {
  const el = e.target as Field;
  const col = el.dataset?.nav;
  if (!col || e.nativeEvent.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;

  const isSelect = col === 'type';
  // 選択肢を開いているあいだは、矢印キーは選択肢の操作に使う
  if (isSelect && el.getAttribute('aria-expanded') === 'true') return;
  const collapsed = el.selectionStart === el.selectionEnd;
  const atStart = collapsed && el.selectionStart === 0;
  // 数値の欄は「10字」のように単位が付くので、数字の終わりを末尾とみなす
  const numeric = col === 'w' || col === 'rows' || col === 'points';
  const textEnd = numeric ? el.value.replace(/\D*$/, '').length : el.value.length;
  const atEnd = collapsed && (el.selectionEnd ?? 0) >= textEnd;
  const multiline = el instanceof HTMLTextAreaElement;

  let dx = 0;
  let dy = 0;
  switch (e.key) {
    case 'Enter':
      if (e.shiftKey || isSelect) return; // Shift+Enter は改行、選択欄の Enter は選択肢を開く
      // 模範解答は改行できるよう、1回目の Enter は改行にして、末尾の空行での Enter で下へ動く
      if (multiline && !(atEnd && el.value.endsWith('\n'))) return;
      dy = 1;
      break;
    case 'ArrowDown':
      if (e.shiftKey || isSelect || (multiline && !atEnd)) return;
      dy = 1;
      break;
    case 'ArrowUp':
      if (e.shiftKey || isSelect || (multiline && !atStart)) return;
      dy = -1;
      break;
    case 'ArrowLeft':
      if (e.shiftKey || !(isSelect || atStart)) return;
      dx = -1;
      break;
    case 'ArrowRight':
      if (e.shiftKey || !(isSelect || atEnd)) return;
      dx = 1;
      break;
    default:
      return;
  }

  let target: Field | null = null;
  if (dy) {
    const sibling = dy > 0 ? 'nextElementSibling' : 'previousElementSibling';
    for (let row = el.closest('tr')?.[sibling]; row && !target; row = row[sibling]) target = findField(row, col);
  } else {
    const row = el.closest('tr');
    for (let i = NAV_COLS.indexOf(col) + dx; row && !target && i >= 0 && i < NAV_COLS.length; i += dx)
      target = findField(row, NAV_COLS[i]);
  }
  if (!target) {
    // 端の行でも、数値の欄の上下キーで値が増減しないようにする
    if (dy && numeric && e.key !== 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
    return;
  }
  // 数値の欄が自分で受け取る上下キー（値の増減）より先に処理するため、ここで止める
  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'Enter' && multiline) {
    // 動く合図に使った末尾の改行は消す（React の入力として反映させるため、input イベントで書き換える）
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    set?.call(el, el.value.slice(0, -1));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  focusField(target, dx < 0 ? 'end' : dx > 0 ? 'start' : 'all');
};

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

  // 行に渡すハンドラは、毎回作り直さない（行を memo 化して、入力した行だけ描き直すため）。
  // 最新の並べ替えの状態は ref から読む。
  const dragRef = useRef<{ dragId: string | null; drop: { id: string; after: boolean } | null }>({
    dragId: null,
    drop: null,
  });
  dragRef.current = { dragId, drop };
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  const endDrag = useCallback(() => {
    setDragId(null);
    setDrop(null);
  }, []);
  const startDrag = useCallback((id: string) => setDragId(id), []);
  const dragOver = useCallback((e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    const cur = dragRef.current;
    if (!cur.dragId) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    if (cur.drop?.id !== id || cur.drop.after !== after) setDrop({ id, after });
  }, []);
  const dropRow = useCallback(
    (e: React.DragEvent<HTMLTableRowElement>) => {
      e.preventDefault();
      const { dragId: from, drop: to } = dragRef.current;
      if (from && to) onMoveRef.current(from, to.id, to.after);
      endDrag();
    },
    [endDrag],
  );

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
  const remove = useCallback((id: string, button: HTMLElement) => {
    const editor = button.closest<HTMLElement>('.editor');
    if (editor) {
      editor.style.minHeight = `${editor.offsetHeight}px`;
      const release = () => {
        editor.style.minHeight = '';
      };
      for (const type of ['wheel', 'touchmove', 'keydown'] as const)
        window.addEventListener(type, release, { once: true, passive: true });
    }
    onRemoveRef.current(id);
  }, []);

  const loadSample = (kind: SampleKind) => {
    if (questions.length && !window.confirm('現在の入力内容をサンプルで置き換えます。よろしいですか？')) return;
    onLoadSample(kind);
  };
  const clear = () => {
    if (!window.confirm('入力内容をすべて削除します。よろしいですか？')) return;
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
              {SAMPLE_LIST.map((s) => (
                <Menu.Item key={s.kind} onClick={() => loadSample(s.kind)}>
                  {s.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Button size="xs" variant="outline" color="red" onClick={clear}>
            すべて削除
          </Button>
        </Group>
      </Group>

      <div className="table-scroll">
        <table className="q-table">
          <colgroup>
            <col className="col-handle" />
            <col className="col-major" />
            <col className="col-sub" />
            <col className="col-type" />
            <col />
            <col className="col-grid" />
            <col className="col-points" />
            <col className="col-delete" />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>大問</th>
              <th>小問</th>
              <th>種類</th>
              <th>模範解答</th>
              <th>大きさ・マス目</th>
              <th>配点</th>
              <th>削除</th>
            </tr>
          </thead>
          <tbody onKeyDownCapture={onNavKey}>
            {questions.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <Text c="gray.7" size="sm" py="md" ta="center">
                    設問を追加してください。
                  </Text>
                </td>
              </tr>
            )}
            {questions.map((q, i) => (
              <QuestionRow
                key={q.id}
                q={q}
                index={i}
                dragging={dragId === q.id}
                dropPosition={drop?.id === q.id && dragId !== q.id ? (drop.after ? 'after' : 'before') : undefined}
                onUpdate={onUpdate}
                onAnswer={onAnswer}
                onRemove={remove}
                onDragStart={startDrag}
                onDragEnd={endDrag}
                onDragOver={dragOver}
                onDrop={dropRow}
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
        radius={40}
        onClick={() => {
          addedId.current = onAdd();
        }}
      >
        ＋ 設問を追加
      </Button>
      <Text mt="sm" ta="right" fw={700} c={scoreOk ? undefined : 'orange.9'}>
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
