import { useEffect, useState } from "react";
import { loadState, saveState, type EisenhowerState } from "@/lib/eisenhower-storage";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { ControlsPanel } from "@/components/ControlsPanel";

const WORKSPACE_HEIGHT = "min(720px, calc(100vh - 2.5rem))";

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
          : s,
      ),
    });
  };

  return (
    <main className="min-h-screen w-full max-w-[100vw] overflow-x-hidden box-border flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div
        className="w-full min-w-0 max-w-full flex flex-col lg:flex-row items-stretch justify-evenly gap-5 lg:gap-6 h-auto lg:h-[var(--workspace-h)]"
        style={{ ["--workspace-h" as string]: WORKSPACE_HEIGHT }}
      >
        <aside className="w-full min-w-0 lg:w-[min(340px,42vw)] lg:max-w-[340px] lg:shrink-0 h-[min(480px,55vh)] lg:h-full flex flex-col">
          <ControlsPanel
            state={state}
            setState={setState}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        </aside>
        <section className="w-full min-w-0 lg:flex-1 lg:max-w-[min(720px,calc(100vw-380px))] lg:h-full flex items-center justify-center">
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
