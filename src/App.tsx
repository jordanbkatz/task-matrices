import { useEffect, useMemo, useState } from "react";
import {
  findTask,
  getTasksAtPath,
  loadState,
  mapTask,
  pruneMatrixPath,
  saveState,
  type EisenhowerState,
} from "@/lib/eisenhower-storage";
import { EisenhowerMatrix } from "@/components/EisenhowerMatrix";
import { ControlsPanel } from "@/components/ControlsPanel";

const WORKSPACE_HEIGHT = "min(720px, calc(100vh - 2.5rem))";

export default function App() {
  const [state, setStateRaw] = useState<EisenhowerState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matrixPath, setMatrixPath] = useState<string[]>([]);

  useEffect(() => {
    setStateRaw(loadState());
  }, []);

  const matrixPathSafe = useMemo(() => {
    if (!state) return [];
    return pruneMatrixPath(state, matrixPath);
  }, [state, matrixPath]);

  const matrixTasks = useMemo(() => {
    if (!state) return [];
    return getTasksAtPath(state, matrixPathSafe);
  }, [state, matrixPathSafe]);

  useEffect(() => {
    if (!state) return;
    if (matrixPathSafe.length !== matrixPath.length) {
      setMatrixPath(matrixPathSafe);
    }
  }, [state, matrixPath, matrixPathSafe]);

  useEffect(() => {
    if (selectedId && !matrixTasks.some((t) => t.id === selectedId)) {
      setSelectedId(null);
    }
  }, [matrixTasks, selectedId]);

  const setState = (s: EisenhowerState) => {
    setStateRaw(s);
    saveState(s);
  };

  if (!state) return <div className="min-h-screen" />;

  const updateState = (mut: (s: EisenhowerState) => EisenhowerState) => {
    setState(mut(state));
  };

  const moveTask = (id: string, urgency: number, importance: number) => {
    updateState((s) => mapTask(s, id, (t) => ({ ...t, urgency, importance })));
  };

  const drillIntoTask = (id: string) => {
    if (!findTask(state, id)) return;
    setMatrixPath((p) => [...pruneMatrixPath(state, p), id]);
    setSelectedId(id);
  };

  const navigateMatrix = (path: string[]) => {
    setMatrixPath(path);
    const leaf = path[path.length - 1];
    setSelectedId(leaf ?? null);
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
            matrixPath={matrixPathSafe}
            onNavigatePath={navigateMatrix}
          />
        </aside>
        <section className="w-full min-w-0 lg:flex-1 lg:max-w-[min(720px,calc(100vw-380px))] lg:h-full flex items-center justify-center">
          <EisenhowerMatrix
            tasks={matrixTasks}
            onMove={moveTask}
            onSelect={setSelectedId}
            selectedId={selectedId}
            onDrillInto={drillIntoTask}
          />
        </section>
      </div>
    </main>
  );
}
