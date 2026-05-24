export type MatrixViewport = {
  scale: number;
  centerPlotX: number;
  centerPlotY: number;
};

export const DEFAULT_VIEWPORT: MatrixViewport = { scale: 1, centerPlotX: 50, centerPlotY: 50 };
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

/** Zoom sensitivity range. Effective speed = value × 2. Default matches former slider max (100). */
export const MIN_ZOOM_SENSITIVITY = 10;
export const MAX_ZOOM_SENSITIVITY = 100;
export const DEFAULT_ZOOM_SENSITIVITY = 100;

/** Maps sensitivity value to internal zoom speed (value × 2). */
export function effectiveZoomSensitivity(slider: number) {
  const clamped = Math.min(MAX_ZOOM_SENSITIVITY, Math.max(MIN_ZOOM_SENSITIVITY, slider));
  return clamped * 2;
}

/** Legacy fixed step — prefer buttonZoomStep(sensitivity). */
export const ZOOM_STEP = 1.08;

export function basePlotFromTask(urgency: number, importance: number) {
  return { x: 100 - urgency, y: 100 - importance };
}

export function plotFromBase(baseX: number, baseY: number, viewport: MatrixViewport) {
  return {
    x: viewport.centerPlotX + (baseX - viewport.centerPlotX) * viewport.scale,
    y: viewport.centerPlotY + (baseY - viewport.centerPlotY) * viewport.scale,
  };
}

export function baseFromPlot(plotX: number, plotY: number, viewport: MatrixViewport) {
  if (viewport.scale <= 1) return { x: plotX, y: plotY };
  return {
    x: viewport.centerPlotX + (plotX - viewport.centerPlotX) / viewport.scale,
    y: viewport.centerPlotY + (plotY - viewport.centerPlotY) / viewport.scale,
  };
}

export function plotFromTask(urgency: number, importance: number, viewport: MatrixViewport) {
  const base = basePlotFromTask(urgency, importance);
  return plotFromBase(base.x, base.y, viewport);
}

export function taskDataFromPlot(plotX: number, plotY: number, viewport: MatrixViewport) {
  const base = baseFromPlot(plotX, plotY, viewport);
  return {
    urgency: Math.round(Math.min(100, Math.max(0, 100 - base.x))),
    importance: Math.round(Math.min(100, Math.max(0, 100 - base.y))),
  };
}

/** Base data coordinate under a screen plot point at the current viewport. */
export function baseUnderPlot(plotX: number, plotY: number, viewport: MatrixViewport) {
  if (viewport.scale <= 1) return { x: plotX, y: plotY };
  return baseFromPlot(plotX, plotY, viewport);
}

/**
 * display = center + (base - center) * scale
 * Keep the base point under the cursor fixed on screen while changing scale.
 */
export function zoomAtPoint(
  viewport: MatrixViewport,
  plotX: number,
  plotY: number,
  factor: number,
): MatrixViewport {
  const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.scale * factor));
  if (Math.abs(newScale - viewport.scale) < 0.0001) return viewport;

  if (newScale <= 1) return DEFAULT_VIEWPORT;

  const baseX = baseUnderPlot(plotX, plotY, viewport).x;
  const baseY = baseUnderPlot(plotX, plotY, viewport).y;

  const newCenterX = (plotX - baseX * newScale) / (1 - newScale);
  const newCenterY = (plotY - baseY * newScale) / (1 - newScale);

  return {
    scale: newScale,
    centerPlotX: newCenterX,
    centerPlotY: newCenterY,
  };
}

export function zoomByFactor(viewport: MatrixViewport, factor: number): MatrixViewport {
  return zoomAtPoint(viewport, viewport.centerPlotX, viewport.centerPlotY, factor);
}

export function setViewportCenter(
  viewport: MatrixViewport,
  centerPlotX: number,
  centerPlotY: number,
): MatrixViewport {
  if (viewport.scale <= 1) return DEFAULT_VIEWPORT;
  return { ...viewport, centerPlotX, centerPlotY };
}

/** Step factor for +/- buttons at the given slider sensitivity. */
export function buttonZoomStep(sensitivity: number) {
  const t = effectiveZoomSensitivity(sensitivity) / 50;
  return 1 + 0.08 * t;
}

/** Smooth wheel zoom at DEFAULT_ZOOM_SENSITIVITY (effective speed 200). */
export function wheelZoomFactor(deltaY: number, sensitivity: number) {
  const effective = effectiveZoomSensitivity(sensitivity);
  const t = effective / 50;
  const raw = Math.exp(-deltaY * 0.0022 * t);
  const maxStep = 0.06 + 0.07 * (effective / 100);
  const maxFactor = 1 + maxStep;
  return Math.min(maxFactor, Math.max(1 / maxFactor, raw));
}
