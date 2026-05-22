export type Task = {
  id: string;
  name: string;
  description: string;
  urgency: number; // 0-100
  importance: number; // 0-100
};

export type TaskSet = {
  id: string;
  name: string;
  tasks: Task[];
};

export type EisenhowerState = {
  sets: TaskSet[];
  activeSetId: string;
};

const KEY = "eisenhower_matrix_app_v1_state";

export function loadState(): EisenhowerState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as EisenhowerState;
    if (!parsed.sets?.length) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

export function saveState(state: EisenhowerState) {
  if (typeof window === "undefined") return;
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
      },
    ],
    activeSetId: id,
  };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
