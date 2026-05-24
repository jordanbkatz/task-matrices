export type Task = {
  id: string;
  name: string;
  description: string;
  urgency: number; // 0-100
  importance: number; // 0-100
};

export type CompletedTask = Task & {
  completedAt: number;
};

export type TaskSet = {
  id: string;
  name: string;
  tasks: Task[];
  completedTasks: CompletedTask[];
};

export type EisenhowerState = {
  sets: TaskSet[];
  activeSetId: string;
};

const KEY = "eisenhower_matrix_app_v1_state";
export const MAX_COMPLETED_TASKS = 10;

export function loadState(): EisenhowerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as EisenhowerState;
    if (!parsed.sets?.length) return defaultState();
    return {
      ...parsed,
      sets: parsed.sets.map((s) => ({
        ...s,
        completedTasks: s.completedTasks ?? [],
      })),
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: EisenhowerState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function defaultState(): EisenhowerState {
  const id = uid();
  return {
    sets: [
      {
        id,
        name: "My Tasks",
        tasks: [],
        completedTasks: [],
      },
    ],
    activeSetId: id,
  };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function completeTaskInSet(set: TaskSet, taskId: string): TaskSet {
  const task = set.tasks.find((t) => t.id === taskId);
  if (!task) return set;
  const completed: CompletedTask = { ...task, completedAt: Date.now() };
  return {
    ...set,
    tasks: set.tasks.filter((t) => t.id !== taskId),
    completedTasks: [completed, ...set.completedTasks].slice(0, MAX_COMPLETED_TASKS),
  };
}

export function reinstateTaskInSet(set: TaskSet, taskId: string): TaskSet {
  const completed = set.completedTasks.find((t) => t.id === taskId);
  if (!completed) return set;
  const { completedAt: _, ...task } = completed;
  return {
    ...set,
    tasks: [...set.tasks, task],
    completedTasks: set.completedTasks.filter((t) => t.id !== taskId),
  };
}
