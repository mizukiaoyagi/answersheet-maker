import { NumberInput, UnstyledButton } from '@mantine/core';
import { useEffect, useRef } from 'react';

/** 押し始めてから、繰り返しが始まるまでの時間 */
const HOLD_DELAY_MS = 400;
/** 繰り返しの間隔 */
const HOLD_INTERVAL_MS = 30;

/** 押し続けた回数に応じた、1回あたりの増減量。長く押すほど大きくなる */
export function holdStep(ticks: number): number {
  if (ticks < 10) return 1;
  if (ticks < 25) return 2;
  if (ticks < 50) return 5;
  return 10;
}

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** 入力欄の幅（省略すると、横いっぱい） */
  width?: number | string;
}

/**
 * 上下ボタンを押し続けると、だんだん速く増減する数値入力。
 * 押し始めて少し待つと繰り返しが始まり、押し続けるほど1回の増減量が 1 → 2 → 5 → 10 と増える。
 */
export function HoldNumberInput({ label, value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, width }: Props) {
  // 繰り返しの中で、最新の値を読めるようにする
  const valueRef = useRef(value);
  valueRef.current = value;
  const timer = useRef<number | undefined>(undefined);

  const stop = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  };
  useEffect(() => stop, []);

  const apply = (delta: number) => {
    const next = Math.min(max, Math.max(min, valueRef.current + delta));
    valueRef.current = next;
    onChange(next);
  };

  const start = (dir: 1 | -1) => {
    stop();
    apply(dir);
    let ticks = 0;
    const tick = () => {
      apply(dir * holdStep(ticks));
      ticks += 1;
      timer.current = window.setTimeout(tick, HOLD_INTERVAL_MS);
    };
    timer.current = window.setTimeout(tick, HOLD_DELAY_MS);
  };

  const spinner = (dir: 1 | -1, text: string, name: string) => (
    <UnstyledButton
      aria-label={name}
      className="hold-spin"
      tabIndex={-1}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        start(dir);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
    >
      {text}
    </UnstyledButton>
  );

  return (
    <NumberInput
      label={label}
      w={width}
      min={min}
      max={max}
      allowDecimal={false}
      hideControls
      value={value}
      onChange={(v) => onChange(typeof v === 'number' ? v : 0)}
      rightSectionWidth={36}
      rightSection={
        <div className="hold-spinner">
          {spinner(1, '▲', `${label}を増やす（押し続けると速くなります）`)}
          {spinner(-1, '▼', `${label}を減らす（押し続けると速くなります）`)}
        </div>
      }
    />
  );
}
