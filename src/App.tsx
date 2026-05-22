import { useEffect, useState } from "react";
import { loadState, saveState, type EisenhowerState } from "@/lib/eisenhower-storage";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { ControlsPanel } from "@/components/ControlsPanel";

export default function App() {
  const [state, setStateRaw] = useState<EisenhowerState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setStateRaw(loadState());
  }, []);

  const setState = (s: EisenhowerState) => {
    setStateRaw(s);
    saveState(s);
  };

  if (!state) return <div className="min-h-screen" />;

  const activeSet = state.sets.find((s) => s.id === state.activeSetId) ?? state.sets[0];

  const moveTask = (id: string, urgency: number, importance: number) => {
    setState({
      ...state,
      sets: state.sets.map((s) =>
        s.id === activeSet.id
          ? { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, urgency, importance } : t)) }
          : s
      ),
    });
  };

  return (
    <main className="min-h-screen p-3 sm:p-6">
      <div className="max-w-[1400px] mx-auto grid gap-4 lg:gap-6 lg:grid-cols-[340px_1fr] lg:items-stretch lg:h-[calc(100vh-3rem)]">
        <aside className="lg:h-full min-h-0">
          <ControlsPanel
            state={state}
            setState={setState}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        </aside>
        <section className="flex items-center justify-center min-h-0 lg:h-full w-full">
          <EisenhowerMatrix
            tasks={activeSet.tasks}
            onMove={moveTask}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </section>
      </div>
    </main>
  );
}
