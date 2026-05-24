import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import type { Task } from "@/lib/eisenhower-storage";
import {
  DEFAULT_VIEWPORT,
  DEFAULT_ZOOM_SENSITIVITY,
  MAX_ZOOM,
  MIN_ZOOM,
  basePlotFromTask,
  buttonZoomStep,
  plotFromBase,
  taskDataFromPlot,
  wheelZoomFactor,
  zoomAtPoint,
  zoomByFactor,
  type MatrixViewport,
} from "@/lib/matrix-viewport";
import { layoutTaskLabels, type TaskLabelLayout } from "@/lib/task-label-layout";
import { Button } from "@/components/ui/button";
import { Minus, Plus, RotateCcw } from "lucide-react";

type Props = {
  tasks: Task[];
  onMove: (id: string, urgency: number, importance: number) => void;
  onSelect?: (id: string | null) => void;
  selectedId?: string | null;
};

function quadrantColor(u: number, i: number) {
  if (u >= 50 && i >= 50) return "var(--q1)";
  if (u < 50 && i >= 50) return "var(--q2)";
  if (u >= 50 && i < 50) return "var(--q3)";
  return "var(--q4)";
}

const LABEL_GAP = 36;
/** Ignore sub-threshold movement so clicks don't nudge tasks. */
const DRAG_THRESHOLD_PX = 6;

function labelStyle(layout: TaskLabelLayout): React.CSSProperties {
  if (layout.anchor === "right") {
    return { left: layout.offsetX, top: layout.offsetY, transform: "translateY(-50%)" };
  }
  return { right: layout.offsetX, top: layout.offsetY, transform: "translateY(-50%)" };
}

export function EisenhowerMatrix({ tasks, onMove, onSelect, selectedId }: Props) {
  const plotRef = useRef<HTMLDivElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const didDragRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragActiveRef = useRef(false);
  const [viewport, setViewport] = useState<MatrixViewport>(DEFAULT_VIEWPORT);

  const getPlotPoint = useCallback((clientX: number, clientY: number) => {
    if (!plotRef.current) return null;
    const r = plotRef.current.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const x = Math.min(Math.max(((clientX - r.left) / r.width) * 100, 0), 100);
    const y = Math.min(Math.max(((clientY - r.top) / r.height) * 100, 0), 100);
    return { x, y };
  }, []);

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragId) return;
      const plot = getPlotPoint(clientX, clientY);
      if (!plot) return;
      const { urgency, importance } = taskDataFromPlot(plot.x, plot.y, viewport);
      onMove(dragId, urgency, importance);
    },
    [dragId, getPlotPoint, onMove, viewport],
  );

  useEffect(() => {
    if (!dragId) return;
    const move = (e: PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;

      if (!dragActiveRef.current) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        dragActiveRef.current = true;
        didDragRef.current = true;
      }

      e.preventDefault();
      handlePointer(e.clientX, e.clientY);
    };
    const end = () => {
      dragStartRef.current = null;
      dragActiveRef.current = false;
      setDragId(null);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragId, handlePointer]);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const plot = getPlotPoint(e.clientX, e.clientY);
      if (!plot) return;
      const factor = wheelZoomFactor(e.deltaY, DEFAULT_ZOOM_SENSITIVITY);
      setViewport((v) => zoomAtPoint(v, plot.x, plot.y, factor));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [getPlotPoint]);

  const labelLayouts = useMemo(() => layoutTaskLabels(tasks), [tasks]);

  const startDrag = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    didDragRef.current = false;
    dragActiveRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDragId(id);
  };

  const handleSelect = (id: string) => {
    if (!didDragRef.current) onSelect?.(id);
  };

  const handlePlotBackgroundPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-task-marker]")) return;
    onSelect?.(null);
  };

  const zoomStep = buttonZoomStep(DEFAULT_ZOOM_SENSITIVITY);
  const zoomIn = () => setViewport((v) => zoomByFactor(v, zoomStep));
  const zoomOut = () => setViewport((v) => zoomByFactor(v, 1 / zoomStep));
  const resetZoom = () => setViewport(DEFAULT_VIEWPORT);

  const labelRailClass =
    "flex items-center justify-center text-[10px] sm:text-xs font-semibold tracking-wider text-foreground/90 uppercase bg-muted/80 border-border/60";

  const gridTransform = {
    transformOrigin: `${viewport.centerPlotX}% ${viewport.centerPlotY}%`,
    transform: viewport.scale > 1 ? `scale(${viewport.scale})` : undefined,
  };

  return (
    <div className="w-full min-w-0 lg:h-full lg:w-auto aspect-square shrink-0 max-w-full">
      <div className="relative h-full w-full rounded-2xl border border-border/80 shadow-2xl overflow-hidden bg-muted/50">
        <div
          className="absolute top-0 left-0 bg-muted/80 border-r border-b border-border/60 pointer-events-none z-10"
          style={{ width: LABEL_GAP, height: LABEL_GAP }}
        />

        <div
          className="absolute flex pointer-events-none border-b border-border/60 z-10"
          style={{ left: LABEL_GAP, right: 0, top: 0, height: LABEL_GAP }}
        >
          <div className={`flex-1 ${labelRailClass} border-r border-border/60`}>Urgent</div>
          <div className={`flex-1 ${labelRailClass}`}>Not Urgent</div>
        </div>

        <div
          className="absolute flex flex-col pointer-events-none border-r border-border/60 z-10"
          style={{ left: 0, top: LABEL_GAP, bottom: 0, width: LABEL_GAP }}
        >
          <div
            className={`flex-1 ${labelRailClass} border-b border-border/60`}
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Important
          </div>
          <div
            className={`flex-1 ${labelRailClass}`}
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            Not Important
          </div>
        </div>

        <div
          className="absolute overflow-hidden"
          style={{ left: LABEL_GAP, top: LABEL_GAP, right: 0, bottom: 0 }}
        >
          <div
            ref={plotRef}
            className="relative w-full h-full touch-none"
            onPointerDown={handlePlotBackgroundPointerDown}
          >
            <div className="absolute inset-0 overflow-hidden" style={gridTransform}>
              <div
                className="absolute inset-0 bg-card/40 backdrop-blur-sm"
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
            </div>

            <div className="absolute inset-0">
              {tasks.map((t) => {
                const base = basePlotFromTask(t.urgency, t.importance);
                const plot = plotFromBase(base.x, base.y, viewport);
                const isSel = selectedId === t.id;
                const color = quadrantColor(t.urgency, t.importance);
                const layout = labelLayouts.get(t.id);
                const dragging = dragId === t.id;

                return (
                  <div
                    key={t.id}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${plot.x}%`,
                      top: `${plot.y}%`,
                      transform: "translate(-50%, -50%)",
                      zIndex: dragging ? 30 : isSel ? 20 : 10,
                    }}
                  >
                    <div
                      data-task-marker
                      className="relative pointer-events-auto cursor-grab active:cursor-grabbing"
                    >
                      <button
                        type="button"
                        onPointerDown={(e) => startDrag(t.id, e)}
                        onClick={() => handleSelect(t.id)}
                        className={`rounded-full shadow-lg transition-transform ${
                          dragging ? "scale-125" : isSel ? "scale-110" : "hover:scale-110"
                        }`}
                        style={{
                          width: 18,
                          height: 18,
                          background: color,
                          boxShadow: `0 0 0 3px color-mix(in oklab, ${color} 30%, transparent), 0 4px 16px color-mix(in oklab, ${color} 50%, transparent)`,
                        }}
                        aria-label={t.name}
                      />
                      {layout && (
                        <button
                          type="button"
                          onPointerDown={(e) => startDrag(t.id, e)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(t.id);
                          }}
                          className={`absolute whitespace-nowrap text-xs sm:text-sm font-medium px-2 py-0.5 rounded-md bg-muted/95 backdrop-blur border shadow-sm hover:bg-accent/80 transition select-none ${
                            isSel
                              ? "border-primary ring-1 ring-primary"
                              : "border-border/80"
                          }`}
                          style={labelStyle(layout)}
                        >
                          {t.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="absolute bottom-2 right-2 z-20">
            <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/90 backdrop-blur p-1 shadow-md">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={zoomOut}
                disabled={viewport.scale <= MIN_ZOOM}
                title="Zoom out"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] font-mono text-muted-foreground w-9 text-center tabular-nums">
                {Math.round(viewport.scale * 100)}%
              </span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={zoomIn}
                disabled={viewport.scale >= MAX_ZOOM}
                title="Zoom in"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={resetZoom}
                disabled={viewport.scale <= MIN_ZOOM}
                title="Reset zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
