import { useRef, useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/eisenhower-storage";

type Props = {
  tasks: Task[];
  onMove: (id: string, urgency: number, importance: number) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
};

function quadrantColor(u: number, i: number) {
  if (u >= 50 && i >= 50) return "var(--q1)";
  if (u < 50 && i >= 50) return "var(--q2)";
  if (u >= 50 && i < 50) return "var(--q3)";
  return "var(--q4)";
}

export function EisenhowerMatrix({ tasks, onMove, onSelect, selectedId }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const didDragRef = useRef(false);

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragId || !ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const x = Math.min(Math.max(clientX - r.left, 0), r.width);
      const y = Math.min(Math.max(clientY - r.top, 0), r.height);
      const urgency = Math.round(100 - (x / r.width) * 100);
      const importance = Math.round(100 - (y / r.height) * 100);
      onMove(dragId, urgency, importance);
    },
    [dragId, onMove]
  );

  useEffect(() => {
    if (!dragId) return;
    const move = (e: PointerEvent) => {
      e.preventDefault();
      didDragRef.current = true;
      handlePointer(e.clientX, e.clientY);
    };
    const up = () => setDragId(null);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragId, handlePointer]);

  const LABEL_GAP = 40; // px, equal padding for both top and left label rails

  // Compute vertical stacking offsets so overlapping labels don't cover each other.
  // For each task, count how many earlier tasks are visually close, then push label down.
  const LABEL_STEP = 22; // px between stacked labels
  const labelOffsets = new Map<string, number>();
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    let slot = 0;
    const used = new Set<number>();
    for (let j = 0; j < i; j++) {
      const o = tasks[j];
      const dx = Math.abs((100 - t.urgency) - (100 - o.urgency));
      const dy = Math.abs((100 - t.importance) - (100 - o.importance));
      if (dx < 10 && dy < 8) {
        used.add(labelOffsets.get(o.id) ?? 0);
      }
    }
    while (used.has(slot)) slot++;
    labelOffsets.set(t.id, slot);
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <div
        className="relative"
        style={{
          aspectRatio: "1 / 1",
          maxWidth: "min(100%, calc(100vh - 6rem))",
          width: "min(100%, calc(100vh - 6rem))",
          paddingLeft: LABEL_GAP,
          paddingTop: LABEL_GAP,
        }}
      >
        {/* Top axis labels */}
        <div
          className="absolute flex pointer-events-none"
          style={{ left: LABEL_GAP, right: 0, top: 0, height: LABEL_GAP }}
        >
          <div className="flex-1 flex items-center justify-center text-xs sm:text-sm font-semibold tracking-wider text-foreground/80 uppercase">
            Urgent
          </div>
          <div className="flex-1 flex items-center justify-center text-xs sm:text-sm font-semibold tracking-wider text-foreground/80 uppercase">
            Not Urgent
          </div>
        </div>

        {/* Left axis labels */}
        <div
          className="absolute flex flex-col pointer-events-none"
          style={{ left: 0, top: LABEL_GAP, bottom: 0, width: LABEL_GAP }}
        >
          <div
            className="flex-1 flex items-center justify-center text-xs sm:text-sm font-semibold tracking-wider text-foreground/80 uppercase"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Important
          </div>
          <div
            className="flex-1 flex items-center justify-center text-xs sm:text-sm font-semibold tracking-wider text-foreground/80 uppercase"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Not Important
          </div>
        </div>

        {/* Matrix area (relative wrapper so dots can extend past clipped bg) */}
        <div className="relative w-full h-full">
          {/* Clipped background layer */}
          <div
            ref={ref}
            className="absolute inset-0 rounded-2xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden shadow-2xl touch-none"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
              backgroundSize: "10% 10%",
            }}
          >
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
              <div style={{ background: "color-mix(in oklab, var(--q1) 12%, transparent)" }} />
              <div style={{ background: "color-mix(in oklab, var(--q2) 10%, transparent)" }} />
              <div style={{ background: "color-mix(in oklab, var(--q3) 10%, transparent)" }} />
              <div style={{ background: "color-mix(in oklab, var(--q4) 8%, transparent)" }} />
            </div>

            <div className="absolute left-0 right-0 top-1/2 h-px bg-foreground/30 pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-foreground/30 pointer-events-none" />
          </div>

          {/* Tasks overlay — not clipped, so dots/labels at edges aren't cut off */}
          <div className="absolute inset-0 pointer-events-none">
            {tasks.map((t) => {
              const left = `${100 - t.urgency}%`;
              const top = `${100 - t.importance}%`;
              const isSel = selectedId === t.id;
              const color = quadrantColor(t.urgency, t.importance);
              const labelRight = t.urgency < 30;
              const stack = labelOffsets.get(t.id) ?? 0;
              const baseY = -2;
              const labelTop = baseY + stack * LABEL_STEP;

              const openEdit = () => {
                if (!didDragRef.current) onSelect?.(t.id);
              };

              return (
                <div
                  key={t.id}
                  className="absolute pointer-events-auto"
                  style={{ left, top, transform: "translate(-50%, -50%)", zIndex: dragId === t.id ? 30 : isSel ? 20 : 10 }}
                >
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        (e.target as Element).setPointerCapture?.(e.pointerId);
                        didDragRef.current = false;
                        setDragId(t.id);
                      }}
                      onClick={openEdit}
                      className={`rounded-full shadow-lg cursor-grab active:cursor-grabbing transition-transform ${
                        dragId === t.id ? "scale-125" : isSel ? "scale-110" : "hover:scale-110"
                      }`}
                      style={{
                        width: 18,
                        height: 18,
                        background: color,
                        boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 30%, transparent), 0 4px 16px color-mix(in oklab, ${color} 50%, transparent)`,
                      }}
                      aria-label={t.name}
                    />
                    <button
                      type="button"
                      onClick={openEdit}
                      className="absolute whitespace-nowrap text-xs sm:text-sm font-medium px-2 py-0.5 rounded-md bg-background/80 backdrop-blur border border-border cursor-pointer hover:bg-background transition"
                      style={{
                        [labelRight ? "right" : "left"]: 22,
                        top: labelTop,
                      } as React.CSSProperties}
                    >
                      {t.name}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
