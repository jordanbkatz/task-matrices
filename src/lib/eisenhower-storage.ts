export type Task = {
  id: string;
  name: string;
  description: string;
  urgency: number; // 0-100
  importance: number; // 0-100
  subtasks: Task[];
};

export type CompletedTask = Task & {
  completedAt: number;
};

export type EisenhowerState = {
  tasks: Task[];
  completedTasks: CompletedTask[];
};

/** @deprecated Legacy shape — used only when migrating saved data. */
type LegacyTaskSet = {
  id: string;
  name: string;
  tasks: Task[];
  completedTasks: CompletedTask[];
};

type LegacyEisenhowerState = {
  sets: LegacyTaskSet[];
  activeSetId: string;
};

const KEY = "eisenhower_matrix_app_v1_state";
export const MAX_COMPLETED_TASKS = 10;

export function loadState(): EisenhowerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

export function saveState(state: EisenhowerState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function defaultState(): EisenhowerState {
  return { tasks: [], completedTasks: [] };
}

function normalizeState(parsed: unknown): EisenhowerState {
  if (!parsed || typeof parsed !== "object") return defaultState();
  const p = parsed as Record<string, unknown>;

  if (Array.isArray(p.tasks)) {
    return {
      tasks: p.tasks.map((t) => migrateTask(t as Task)),
      completedTasks: ((p.completedTasks as CompletedTask[]) ?? []).map(migrateTask),
    };
  }

  const legacy = parsed as LegacyEisenhowerState;
  if (legacy.sets?.length) {
    const active = legacy.sets.find((s) => s.id === legacy.activeSetId) ?? legacy.sets[0]!;
    return {
      tasks: (active.tasks ?? []).map(migrateTask),
      completedTasks: (active.completedTasks ?? []).map(migrateTask),
    };
  }

  return defaultState();
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createTask(
  partial: Pick<Task, "name"> & Partial<Omit<Task, "id" | "name" | "subtasks">>,
): Task {
  return {
    id: uid(),
    name: partial.name,
    description: partial.description ?? "",
    urgency: partial.urgency ?? 50,
    importance: partial.importance ?? 50,
    subtasks: partial.subtasks ?? [],
  };
}

function migrateTask(task: Task): Task {
  const raw = task as Task & { subtasks?: Task[] };
  return {
    ...raw,
    subtasks: (raw.subtasks ?? []).map(migrateTask),
  };
}

export function findTask(state: EisenhowerState, taskId: string): Task | null {
  for (const task of state.tasks) {
    const found = findTaskInTree(task, taskId);
    if (found) return found;
  }
  return null;
}

function findTaskInTree(task: Task, taskId: string): Task | null {
  if (task.id === taskId) return task;
  for (const sub of task.subtasks) {
    const found = findTaskInTree(sub, taskId);
    if (found) return found;
  }
  return null;
}

/** Tasks shown on the matrix for a drill-down path (empty = root). */
export function getTasksAtPath(state: EisenhowerState, path: string[]): Task[] {
  if (path.length === 0) return state.tasks;
  const parent = findTask(state, path[path.length - 1]!);
  return parent?.subtasks ?? [];
}

/** Drop path segments that no longer exist in the tree. */
export function pruneMatrixPath(state: EisenhowerState, path: string[]): string[] {
  const out: string[] = [];
  let siblings = state.tasks;
  for (const id of path) {
    const task = siblings.find((t) => t.id === id);
    if (!task) break;
    out.push(id);
    siblings = task.subtasks;
  }
  return out;
}

export function mapTask(
  state: EisenhowerState,
  taskId: string,
  updater: (task: Task) => Task,
): EisenhowerState {
  return {
    ...state,
    tasks: state.tasks.map((t) => mapTaskInTree(t, taskId, updater)),
  };
}

function mapTaskInTree(task: Task, taskId: string, updater: (task: Task) => Task): Task {
  const next = task.id === taskId ? updater(task) : task;
  return {
    ...next,
    subtasks: next.subtasks.map((st) => mapTaskInTree(st, taskId, updater)),
  };
}

function removeTaskFromList(tasks: Task[], taskId: string): Task[] {
  return tasks
    .filter((t) => t.id !== taskId)
    .map((t) => ({ ...t, subtasks: removeTaskFromList(t.subtasks, taskId) }));
}

/** Parent id for a new task: selected task, else matrix container, else root. */
export function resolveAddParentId(
  state: EisenhowerState,
  path: string[],
  selectedId: string | null,
  visibleTaskIds: Set<string>,
): string | null {
  if (selectedId && visibleTaskIds.has(selectedId)) return selectedId;
  if (path.length > 0) return path[path.length - 1]!;
  return null;
}

export function addTask(
  state: EisenhowerState,
  parentId: string | null,
  task: Task,
): EisenhowerState {
  if (!parentId) return { ...state, tasks: [...state.tasks, task] };
  return mapTask(state, parentId, (t) => ({ ...t, subtasks: [...t.subtasks, task] }));
}

export function completeTask(state: EisenhowerState, taskId: string): EisenhowerState {
  const task = findTask(state, taskId);
  if (!task) return state;
  const completed: CompletedTask = { ...task, completedAt: Date.now() };
  return {
    ...state,
    tasks: removeTaskFromList(state.tasks, taskId),
    completedTasks: [completed, ...state.completedTasks].slice(0, MAX_COMPLETED_TASKS),
  };
}

export function reinstateTask(state: EisenhowerState, taskId: string): EisenhowerState {
  const completed = state.completedTasks.find((t) => t.id === taskId);
  if (!completed) return state;
  const { completedAt: _, ...task } = completed;
  return {
    ...state,
    tasks: [...state.tasks, task],
    completedTasks: state.completedTasks.filter((t) => t.id !== taskId),
  };
}
