import { useEffect, useState } from "react";
import type { EisenhowerState, Task, TaskSet } from "@/lib/eisenhower-storage";
import { uid } from "@/lib/eisenhower-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Check, X, FolderPlus, ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  state: EisenhowerState;
  setState: (s: EisenhowerState) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

type Panel = "none" | "add" | "list" | "edit";

export function ControlsPanel({ state, setState, selectedId, setSelectedId }: Props) {
  const activeSet = state.sets.find((s) => s.id === state.activeSetId) ?? state.sets[0];

  const [panel, setPanel] = useState<Panel>("none");

  // Add task fields
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [urgency, setUrgency] = useState(50);
  const [importance, setImportance] = useState(50);

  // Edit task fields
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eUrgency, setEUrgency] = useState(50);
  const [eImportance, setEImportance] = useState(50);

  // Set management
  const [newSetName, setNewSetName] = useState("");
  const [editingSet, setEditingSet] = useState(false);
  const [setRename, setSetRename] = useState("");

  const selectedTask = activeSet.tasks.find((t) => t.id === selectedId) ?? null;

  // When a task is selected (e.g. from the matrix), open the edit panel
  useEffect(() => {
    if (selectedTask) {
      setEName(selectedTask.name);
      setEDesc(selectedTask.description);
      setEUrgency(selectedTask.urgency);
      setEImportance(selectedTask.importance);
      setPanel("edit");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Keep edit fields in sync if the task moves via drag while editing
  useEffect(() => {
    if (panel === "edit" && selectedTask) {
      setEUrgency(selectedTask.urgency);
      setEImportance(selectedTask.importance);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask?.urgency, selectedTask?.importance]);

  const openPanel = (p: Panel) => {
    setPanel((cur) => (cur === p ? "none" : p));
    if (p !== "edit") setSelectedId(null);
  };

  const updateActiveSet = (mut: (s: TaskSet) => TaskSet) => {
    setState({
      ...state,
      sets: state.sets.map((s) => (s.id === activeSet.id ? mut(s) : s)),
    });
  };

  const addTask = () => {
    if (!name.trim()) return;
    const task: Task = { id: uid(), name: name.trim(), description: desc.trim(), urgency, importance };
    updateActiveSet((s) => ({ ...s, tasks: [...s.tasks, task] }));
    setName("");
    setDesc("");
    setUrgency(50);
    setImportance(50);
    setPanel("none");
  };

  const saveEdit = () => {
    if (!selectedTask || !eName.trim()) return;
    updateActiveSet((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === selectedTask.id
          ? { ...t, name: eName.trim(), description: eDesc.trim(), urgency: eUrgency, importance: eImportance }
          : t
      ),
    }));
    setPanel("none");
    setSelectedId(null);
  };

  const removeTask = (id: string) => {
    updateActiveSet((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    if (selectedId === id) {
      setSelectedId(null);
      setPanel("none");
    }
  };

  const addSet = () => {
    if (!newSetName.trim()) return;
    const ns: TaskSet = { id: uid(), name: newSetName.trim(), tasks: [] };
    setState({ ...state, sets: [...state.sets, ns], activeSetId: ns.id });
    setNewSetName("");
  };

  const deleteSet = () => {
    if (state.sets.length <= 1) return;
    const remaining = state.sets.filter((s) => s.id !== activeSet.id);
    setState({ ...state, sets: remaining, activeSetId: remaining[0].id });
  };

  const renameSet = () => {
    if (!setRename.trim()) return;
    updateActiveSet((s) => ({ ...s, name: setRename.trim() }));
    setEditingSet(false);
  };

  return (
    <div className="h-full flex flex-col gap-5 p-5 bg-card/60 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-y-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
          Task Matrix
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Prioritize by urgency & importance</p>
      </div>

      {/* Task Sets */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Task Set</Label>
        {editingSet ? (
          <div className="flex gap-1">
            <Input
              value={setRename}
              onChange={(e) => setSetRename(e.target.value)}
              placeholder={activeSet.name}
              onKeyDown={(e) => e.key === "Enter" && renameSet()}
            />
            <Button size="icon" variant="secondary" onClick={renameSet}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditingSet(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-1">
            <Select
              value={activeSet.id}
              onValueChange={(v) => {
                setState({ ...state, activeSetId: v });
                setSelectedId(null);
                setPanel("none");
              }}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {state.sets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSetRename(activeSet.name);
                setEditingSet(true);
              }}
              title="Rename set"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={deleteSet}
              disabled={state.sets.length <= 1}
              title="Delete set"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="flex gap-1">
          <Input
            placeholder="New set name"
            value={newSetName}
            onChange={(e) => setNewSetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSet()}
          />
          <Button size="icon" variant="secondary" onClick={addSet}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Tasks List dropdown */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => openPanel("list")}
          className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
        >
          <span>Tasks List ({activeSet.tasks.length})</span>
          {panel === "list" ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {panel === "list" && (
          <div className="space-y-2 max-h-72 overflow-y-auto -mr-2 pr-2">
            {activeSet.tasks.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No tasks yet.</p>
            )}
            {activeSet.tasks.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
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
                      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {t.description}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground">
                      <span>U: {t.urgency}</span>
                      <span>I: {t.importance}</span>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTask(t.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Edit Task panel */}
      {panel === "edit" && selectedTask && (
        <div className="space-y-3 p-3 rounded-lg border border-primary/50 bg-background/40">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Edit Task</Label>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => {
                setPanel("none");
                setSelectedId(null);
              }}
            >
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
          <div className="flex gap-2">
            <Button onClick={saveEdit} className="flex-1" disabled={!eName.trim()}>
              <Check className="h-4 w-4 mr-1" /> Save
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => removeTask(selectedTask.id)}
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add Task panel */}
      {panel === "add" && (
        <div className="space-y-3 p-3 rounded-lg border border-border bg-background/40">
          <div className="flex items-center justify-between">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Add Task</Label>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPanel("none")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
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
          <Button onClick={addTask} className="w-full" disabled={!name.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </div>
      )}

      {panel !== "add" && panel !== "edit" && (
        <Button onClick={() => openPanel("add")} className="w-full" size="lg">
          <Plus className="h-5 w-5 mr-1" /> Add Task
        </Button>
      )}
    </div>
  );
}
