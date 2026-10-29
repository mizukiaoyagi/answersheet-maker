import { MetaForm } from './components/MetaForm';
import { Preview } from './components/Preview';
import { QuestionTable } from './components/QuestionTable';
import { TopBar } from './components/TopBar';
import { useAppState } from './hooks/useAppState';

export function App() {
  const { state, setMeta, updateQuestion, setAnswer, removeQuestion, move, addQuestion, loadSample, clearAll } =
    useAppState();
  const { meta, questions } = state;

  return (
    <div className="app">
      {/* 印刷時の用紙サイズと向き */}
      <style>{`@page { size: ${meta.paper} ${meta.orientation}; margin: 0; }`}</style>

      <TopBar meta={meta} questions={questions} />

      <div className="main">
        <section className="editor no-print">
          <MetaForm meta={meta} onChange={setMeta} />
          <QuestionTable
            questions={questions}
            fullScore={meta.fullScore}
            onUpdate={updateQuestion}
            onAnswer={setAnswer}
            onRemove={removeQuestion}
            onMove={move}
            onAdd={addQuestion}
            onLoadSample={loadSample}
            onClear={clearAll}
          />
        </section>

        <Preview meta={meta} questions={questions} />
      </div>
    </div>
  );
}
