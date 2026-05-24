import type { Task } from "@/lib/eisenhower-storage";

export type TaskLabelLayout = {
  anchor: "right" | "left";
  offsetX: number;
  offsetY: number;
};

const LABEL_H = 22;
const DOT_R = 10;
const GAP = 5;
const STACK_STEP = 20;
const PROX_URGENCY = 12;
const PROX_IMPORTANCE = 10;

function clusterTasks(tasks: Task[]): Task[][] {
  const clusters: Task[][] = [];
  const assigned = new Set<string>();

  const sorted = [...tasks].sort(
    (a, b) => b.importance - a.importance || b.urgency - a.urgency || a.name.localeCompare(b.name),
  );

  for (const task of sorted) {
    if (assigned.has(task.id)) continue;

    const cluster = [task];
    assigned.add(task.id);

    for (const other of sorted) {
      if (assigned.has(other.id)) continue;
      const du = Math.abs(task.urgency - other.urgency);
      const di = Math.abs(task.importance - other.importance);
      if (du <= PROX_URGENCY && di <= PROX_IMPORTANCE) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    cluster.sort(
      (a, b) => b.importance - a.importance || b.urgency - a.urgency || a.name.localeCompare(b.name),
    );
    clusters.push(cluster);
  }

  return clusters;
}

export function layoutTaskLabels(tasks: Task[]): Map<string, TaskLabelLayout> {
  const result = new Map<string, TaskLabelLayout>();
  if (tasks.length === 0) return result;

  for (const cluster of clusterTasks(tasks)) {
    const avgUrgency = cluster.reduce((sum, t) => sum + t.urgency, 0) / cluster.length;
    const anchor: "right" | "left" = avgUrgency >= 35 ? "right" : "left";

    cluster.forEach((task, index) => {
      result.set(task.id, {
        anchor,
        offsetX: DOT_R + GAP,
        offsetY: -LABEL_H / 2 + index * STACK_STEP,
      });
    });
  }

  return result;
}
