import { useEffect, useState } from "react";
import type { EisenhowerState } from "@/lib/eisenhower-storage";
import {
  addTask,
  completeTask,
  createTask,
  findTask,
  getTasksAtPath,
  mapTask,
  reinstateTask,
  resolveAddParentId,
} from "@/lib/eisenhower-storage";
import { TaskBreadcrumb } from "@/components/TaskBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Plus, Check, X, ChevronDown, ChevronRight, CheckCircle2, Undo2 } from "lucide-react";

type Props = {
  state: EisenhowerState;
  setState: (s: EisenhowerState) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  matrixPath: string[];
  onNavigatePath: (path: string[]) => void;
};

type ActivePanel = "list" | "completed" | "add" | "edit" | null;

export function ControlsPanel({
  state,
  setState,
  selectedId,
  setSelectedId,
  matrixPath,
  onNavigatePath,
}: Props) {
  const visibleTasks = getTasksAtPath(state, matrixPath);
  const visibleTaskIds = new Set(visibleTasks.map((t) => t.id));

  const [activePanel, setActivePanel] = useState<ActivePanel>("list");

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [urgency, setUrgency] = useState(50);
  const [importance, setImportance] = useState(50);

  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eUrgency, setEUrgency] = useState(50);
  const [eImportance, setEImportance] = useState(50);

  const selectedTask = selectedId ? findTask(state, selectedId) : null;

  const addParentId = resolveAddParentId(state, matrixPath, selectedId, visibleTaskIds);
  const addParentTask = addParentId ? findTask(state, addParentId) : null;
  const addingSubtask = addParentId !== null;
  const addButtonLabel =
    matrixPath.length > 0 ? "Add Task" : addingSubtask ? "Add Subtask" : "Add Task";

  const selectTask = (id: string) => {
    setSelectedId(id);
    setActivePanel("edit");
  };

  const openList = () => {
    setActivePanel((cur) => (cur === "list" ? null : "list"));
    setSelectedId(null);
  };

  const openCompleted = () => {
    setActivePanel((cur) => (cur === "completed" ? null : "completed"));
    setSelectedId(null);
  };

  const openAdd = () => {
    setActivePanel((cur) => (cur === "add" ? null : "add"));
  };

  const closePanel = () => {
    setActivePanel(null);
    setSelectedId(null);
  };

  useEffect(() => {
    if (selectedId && selectedTask) {
      setEName(selectedTask.name);
      setEDesc(selectedTask.description);
      setEUrgency(selectedTask.urgency);
      setEImportance(selectedTask.importance);
      setActivePanel("edit");
    } else if (!selectedId && activePanel === "edit") {
      setActivePanel(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (activePanel === "edit" && selectedTask) {
      setEUrgency(selectedTask.urgency);
      setEImportance(selectedTask.importance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.urgency, selectedTask?.importance]);

  const updateState = (mut: (s: EisenhowerState) => EisenhowerState) => {
    setState(mut(state));
  };

  const addTaskHandler = () => {
    if (!name.trim()) return;
    const task = createTask({
      name: name.trim(),
      description: desc.trim(),
      urgency,
      importance,
    });
    updateState((s) => addTask(s, addParentId, task));
    setName("");
    setDesc("");
    setUrgency(50);
    setImportance(50);
    setSelectedId(task.id);
    setActivePanel("edit");
  };

  const saveEdit = () => {
    if (!selectedTask || !eName.trim()) return;
    updateState((s) =>
      mapTask(s, selectedTask.id, (t) => ({
        ...t,
        name: eName.trim(),
        description: eDesc.trim(),
        urgency: eUrgency,
        importance: eImportance,
      })),
    );
    closePanel();
  };

  const completeTaskHandler = (id: string) => {
    updateState((s) => completeTask(s, id));
    if (selectedId === id) closePanel();
  };

  const reinstateTaskHandler = (id: string) => {
    updateState((s) => reinstateTask(s, id));
  };

  const formatCompletedAt = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div className="h-full flex flex-col gap-4 p-4 sm:p-5 bg-card/60 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden min-h-0">
      <div className="shrink-0 space-y-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Task Matrices
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Prioritize by urgency & importance</p>
        </div>
        <TaskBreadcrumb state={state} path={matrixPath} onNavigate={onNavigatePath} />
      </div>

      <div className="border-t border-border shrink-0" />

      <div className="flex-1 min-h-0 flex flex-col gap-2">
        <button
          type="button"
          onClick={openList}
          className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition shrink-0"
        >
          <span>
            {matrixPath.length > 0
              ? `Subtasks (${visibleTasks.length})`
              : `Tasks List (${visibleTasks.length})`}
          </span>
          {activePanel === "list" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={openCompleted}
          className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition shrink-0"
        >
          <span>Recently Completed ({state.completedTasks.length})</span>
          {activePanel === "completed" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {activePanel === "list" && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 -mr-1 pr-1">
            {visibleTasks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {matrixPath.length > 0 ? "No subtasks yet." : "No tasks yet."}
              </p>
            )}
            {visibleTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTask(t.id)}
                className={`group p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedId === t.id
                    ? "bg-accent border-primary"
                    : "bg-background/40 border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{t.name}</div>
                    {t.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] font-mono text-muted-foreground">
                      <span>U: {t.urgency}</span>
                      <span>I: {t.importance}</span>
                      {t.subtasks.length > 0 && (
                        <span className="text-primary">{t.subtasks.length} subtasks</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition text-primary hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      completeTaskHandler(t.id);
                    }}
                    title="Mark complete"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activePanel === "completed" && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 -mr-1 pr-1">
            {state.completedTasks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No completed tasks yet.</p>
            )}
            {state.completedTasks.map((t) => (
              <div key={t.id} className="group p-3 rounded-lg border bg-background/30 border-border/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate text-muted-foreground line-through decoration-muted-foreground/50">
                      {t.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Completed {formatCompletedAt(t.completedAt)}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => reinstateTaskHandler(t.id)}
                    title="Reinstate task"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activePanel === "edit" && selectedTask && (
        <div className="space-y-3 p-3 rounded-lg border border-primary/50 bg-background/40 shrink-0">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Edit Task</Label>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={closePanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input placeholder="Task name" value={eName} onChange={(e) => setEName(e.target.value)} />
          <Textarea
            placeholder="Description"
            value={eDesc}
            onChange={(e) => setEDesc(e.target.value)}
            rows={2}
          />
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Urgency</span>
              <span className="font-mono font-semibold">{eUrgency}</span>
            </div>
            <Slider value={[eUrgency]} onValueChange={(v) => setEUrgency(v[0])} max={100} step={1} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Importance</span>
              <span className="font-mono font-semibold">{eImportance}</span>
            </div>
            <Slider value={[eImportance]} onValueChange={(v) => setEImportance(v[0])} max={100} step={1} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {selectedTask.subtasks.length > 0
              ? `${selectedTask.subtasks.length} subtask${selectedTask.subtasks.length === 1 ? "" : "s"} — `
              : ""}
            double-click on the matrix to open subtasks
          </p>
          <div className="flex gap-2">
            <Button onClick={saveEdit} className="flex-1" disabled={!eName.trim()}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => completeTaskHandler(selectedTask.id)}
              title="Mark complete"
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {activePanel === "add" && (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-background/40 shrink-0">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              {addButtonLabel}
            </Label>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={closePanel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {addingSubtask && addParentTask && (
            <p className="text-[10px] text-muted-foreground">
              Under: <span className="font-medium text-foreground">{addParentTask.name}</span>
            </p>
          )}
          <Input placeholder="Task name" value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
          />
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Urgency</span>
              <span className="font-mono font-semibold">{urgency}</span>
            </div>
            <Slider value={[urgency]} onValueChange={(v) => setUrgency(v[0])} max={100} step={1} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Importance</span>
              <span className="font-mono font-semibold">{importance}</span>
            </div>
            <Slider value={[importance]} onValueChange={(v) => setImportance(v[0])} max={100} step={1} />
          </div>
          <Button onClick={addTaskHandler} className="w-full" disabled={!name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> {addButtonLabel}
          </Button>
        </div>
      )}

      {activePanel !== "add" && activePanel !== "edit" && (
        <Button onClick={openAdd} className="w-full shrink-0" size="lg">
          <Plus className="h-5 w-5 mr-1" /> {addButtonLabel}
        </Button>
      )}
    </div>
  );
}
