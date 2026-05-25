import type { EisenhowerState } from "@/lib/eisenhower-storage";
import { findTask } from "@/lib/eisenhower-storage";
import { ChevronRight } from "lucide-react";

type Props = {
  state: EisenhowerState;
  path: string[];
  onNavigate: (path: string[]) => void;
};

export function TaskBreadcrumb({ state, path, onNavigate }: Props) {
  if (path.length === 0) return null;

  const crumbs: { label: string; path: string[] }[] = [{ label: "All Tasks", path: [] }];
  let segment: string[] = [];
  for (const id of path) {
    segment = [...segment, id];
    const task = findTask(state, id);
    crumbs.push({ label: task?.name ?? "…", path: [...segment] });
  }

  return (
    <nav
      aria-label="Task location"
      className="w-full min-w-0 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
    >
      {crumbs.map((crumb, i) => (
        <span key={crumb.path.join("/") || "root"} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
          <button
            type="button"
            onClick={() => onNavigate(crumb.path)}
            className={`truncate max-w-[9rem] rounded px-1.5 py-0.5 transition hover:text-foreground hover:bg-muted/80 ${
              i === crumbs.length - 1 ? "font-medium text-foreground" : ""
            }`}
            title={crumb.label}
          >
            {crumb.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
