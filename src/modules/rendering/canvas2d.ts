import type { EquipmentConstraintReport } from "../equipment/constraints";
import { equipmentStatus, equipmentStatusSummary } from "../equipment/constraints";
import type { EquipmentItem } from "../equipment/model";
import type { ProfileSnapshot } from "../geometry/model";
import { bodyXFromProfileS } from "../../shared/body-coordinates";
import { formatNumber } from "../../shared/format";
import { logger } from "../../shared/logger";
import { bodyPointToXzProjection, type ScreenProjection2 } from "./coordinate-adapter";
import type { RenderOptions } from "./model";
import { renderingStatusColor } from "./statusColors";

export interface CanvasScale {
  readonly map: (point: ScreenProjection2) => Readonly<{ x: number; y: number }>;
  readonly inverse: (cssX: number, cssY: number) => ScreenProjection2;
  readonly width: number;
  readonly height: number;
  readonly yLimit: number;
}

export interface EquipmentXzProjection {
  readonly center: ScreenProjection2;
  readonly halfWidth: number;
  readonly halfHeight: number;
}

export function resizeCanvas(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  logger.debug("canvas resized", { width: canvas.width, height: canvas.height, ratio });
}

export function createCanvasProfileScale(canvas: HTMLCanvasElement, snapshot: ProfileSnapshot): CanvasScale {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  const totalLength = snapshot.extents.totalLength;
  const yLimit = Math.max(snapshot.extents.maxHalfHeightZ * 1.24, snapshot.state.height * 0.08, 0.1);
  const padding = { left: 54, right: 28, top: 30, bottom: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const scale = Math.min(innerW / totalLength, innerH / (2 * yLimit));
  const drawingW = totalLength * scale;
  const originX = padding.left + (innerW - drawingW) / 2 + drawingW / 2;
  const originY = padding.top + innerH / 2;
  logger.debug("canvas scale created", {
    frame: "Body XZ: right=+X, down=+Z",
    xExtents: [-totalLength / 2, totalLength / 2],
    zExtents: [-yLimit, yLimit],
    totalLength,
    cylindricalInsertLength: snapshot.state.cylindricalInsertLength,
    yLimit,
    scale,
  });

  return Object.freeze({
    map: (point: ScreenProjection2) => Object.freeze({ x: originX + point.right * scale, y: originY + point.down * scale }),
    inverse: (cssX: number, cssY: number) => Object.freeze({
      right: (cssX - originX) / scale,
      down: (cssY - originY) / scale,
    }),
    width,
    height,
    yLimit,
  });
}

export function bodyXzToCanvas(scale: CanvasScale, right: number, down: number): { x: number; y: number } {
  return scale.map({ right, down });
}

export function canvasToBodyXz(scale: CanvasScale, cssX: number, cssY: number): { bodyX: number; bodyZ: number } {
  const { right, down } = scale.inverse(cssX, cssY);
  return Object.freeze({ bodyX: right, bodyZ: down });
}

export function hitTestEquipmentXz(
  bodyX: number,
  bodyZ: number,
  equipment: readonly EquipmentItem[],
): string | null {
  for (let idx = equipment.length - 1; idx >= 0; idx -= 1) {
    const item = equipment[idx];
    const projection = equipmentXzProjection(item);
    const left = projection.center.right - projection.halfWidth;
    const right = projection.center.right + projection.halfWidth;
    const bottom = projection.center.down - projection.halfHeight;
    const top = projection.center.down + projection.halfHeight;

    if (bodyX >= left && bodyX <= right && bodyZ >= bottom && bodyZ <= top) {
      return item.id;
    }
  }
  return null;
}

function drawGrid(context: CanvasRenderingContext2D, scale: CanvasScale, totalLength: number): void {
  context.save();
  context.strokeStyle = "#e2e8e1";
  context.lineWidth = 1;
  context.fillStyle = "#6d7a75";
  context.font = "12px Segoe UI, Arial, sans-serif";

  for (let index = 0; index <= 10; index += 1) {
    const x = -totalLength / 2 + (totalLength * index) / 10;
    const px = scale.map({ right: x, down: 0 }).x;
    context.beginPath();
    context.moveTo(px, 26);
    context.lineTo(px, scale.height - 36);
    context.stroke();
    context.fillText(formatNumber(x, 1), px - 10, scale.height - 14);
  }

  for (let index = -4; index <= 4; index += 1) {
    const z = (scale.yLimit * index) / 4;
    const py = scale.map({ right: 0, down: z }).y;
    context.beginPath();
    context.moveTo(42, py);
    context.lineTo(scale.width - 24, py);
    context.stroke();
    if (index !== 0) context.fillText(formatNumber(z, 1), 8, py + 4);
  }

  context.restore();
}

export function equipmentXzProjection(item: EquipmentItem): EquipmentXzProjection {
  const center = bodyPointToXzProjection(item.position);
  if (item.shape === "sphere") {
    return Object.freeze({
      center,
      halfWidth: item.dimensions.radius,
      halfHeight: item.dimensions.radius,
    });
  }

  if (item.shape === "cylinder") {
    return Object.freeze({
      center,
      halfWidth: item.orientation === "x" ? item.dimensions.length / 2 : item.dimensions.radius,
      halfHeight: item.orientation === "z" ? item.dimensions.length / 2 : item.dimensions.radius,
    });
  }

  return Object.freeze({
    center,
    halfWidth: item.dimensions.lengthX / 2,
    halfHeight: item.dimensions.heightZ / 2,
  });
}

function drawEquipmentOverlay(
  context: CanvasRenderingContext2D,
  scale: CanvasScale,
  equipment: readonly EquipmentItem[],
  report: EquipmentConstraintReport | undefined,
): void {
  if (equipment.length === 0) return;

  const equipmentIds = new Set(equipment.map((item) => item.id));
  for (const id of report?.statusById.keys() ?? []) {
    if (!equipmentIds.has(id)) logger.warn("2d overlay received status for missing equipment", { id });
  }

  context.save();
  for (const item of equipment) {
    const status = equipmentStatus(report, item.id);
    const statusColor = renderingStatusColor(status);
    const projection = equipmentXzProjection(item);
    const left = scale.map({ right: projection.center.right - projection.halfWidth, down: projection.center.down }).x;
    const right = scale.map({ right: projection.center.right + projection.halfWidth, down: projection.center.down }).x;
    const top = scale.map({ right: projection.center.right, down: projection.center.down - projection.halfHeight }).y;
    const bottom = scale.map({ right: projection.center.right, down: projection.center.down + projection.halfHeight }).y;
    const width = Math.max(4, right - left);
    const height = Math.max(4, bottom - top);

    context.fillStyle = statusColor.canvasFill;
    context.strokeStyle = statusColor.canvasStroke;
    context.lineWidth = 1.8;

    if (item.shape === "sphere") {
      context.beginPath();
      const center = scale.map(projection.center);
      context.ellipse(center.x, center.y, width / 2, height / 2, 0, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    } else {
      context.beginPath();
      context.rect(left, top, width, height);
      context.fill();
      context.stroke();
    }
  }
  context.restore();

  logger.debug("2d equipment overlay rendered", {
    equipmentCount: equipment.length,
    statusSummary: equipmentStatusSummary(report),
  });
}

export interface CanvasInteractionState {
  readonly selectedEquipmentId: string | null;
  readonly hoveredEquipmentId: string | null;
}

export function renderCanvasProfile(
  canvas: HTMLCanvasElement,
  snapshot: ProfileSnapshot,
  options: RenderOptions,
  equipment: readonly EquipmentItem[] = [],
  report?: EquipmentConstraintReport,
): void {
  resizeCanvas(canvas);
  drawCanvasProfileContent(canvas, snapshot, options, equipment, report);
}

export function renderCanvasInteractionOverlay(
  overlayCanvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement,
  snapshot: ProfileSnapshot,
  equipment: readonly EquipmentItem[] = [],
  interaction?: CanvasInteractionState,
): void {
  const scale = createCanvasProfileScale(baseCanvas, snapshot);
  drawInteractionHighlights(overlayCanvas, scale, equipment, interaction);
}

export function syncOverlayCanvasSize(
  overlayCanvas: HTMLCanvasElement,
  baseCanvas: HTMLCanvasElement,
): void {
  const ratio = window.devicePixelRatio || 1;
  const rect = baseCanvas.getBoundingClientRect();
  overlayCanvas.width = Math.max(1, Math.round(rect.width * ratio));
  overlayCanvas.height = Math.max(1, Math.round(rect.height * ratio));
}

export function clearCanvasOverlay(overlayCanvas: HTMLCanvasElement): void {
  const context = overlayCanvas.getContext("2d");
  if (!context) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = overlayCanvas.getBoundingClientRect();
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, rect.width, rect.height);
}

function drawInteractionHighlights(
  overlayCanvas: HTMLCanvasElement,
  scale: CanvasScale,
  equipment: readonly EquipmentItem[],
  interaction?: CanvasInteractionState,
): void {
  const context = overlayCanvas.getContext("2d");
  if (!context) {
    logger.warn("2d overlay canvas context unavailable", { canvasId: overlayCanvas.id });
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, scale.width, scale.height);

  if (!interaction || equipment.length === 0) return;

  const selectedId = interaction.selectedEquipmentId;
  const hoveredId = interaction.hoveredEquipmentId;
  const hoveredItem = hoveredId ? equipment.find((e) => e.id === hoveredId) : undefined;
  const selectedItem = selectedId ? equipment.find((e) => e.id === selectedId) : undefined;
  const hoverSkipId = selectedId === hoveredId ? selectedId : undefined;

  const selectionStroke = "rgba(11, 127, 119, 0.85)";
  const selectionFill = "rgba(11, 127, 119, 0.08)";
  const hoverStroke = "rgba(56, 161, 156, 0.65)";
  const hoverFill = "rgba(56, 161, 156, 0.06)";

  const drawInteractionRect = (
    item: EquipmentItem,
    stroke: string,
    fill: string,
    expand: number,
  ): void => {
    const projection = equipmentXzProjection(item);
    const left = scale.map({ right: projection.center.right - projection.halfWidth - expand, down: projection.center.down }).x;
    const right = scale.map({ right: projection.center.right + projection.halfWidth + expand, down: projection.center.down }).x;
    const top = scale.map({ right: projection.center.right, down: projection.center.down - projection.halfHeight - expand }).y;
    const bottom = scale.map({ right: projection.center.right, down: projection.center.down + projection.halfHeight + expand }).y;
    const width = Math.max(4, right - left);
    const height = Math.max(4, bottom - top);

    context.save();
    context.strokeStyle = stroke;
    context.fillStyle = fill;
    context.lineWidth = 2.8;
    context.globalAlpha = 1;

    if (item.shape === "sphere") {
      context.beginPath();
      const center = scale.map(projection.center);
      context.ellipse(center.x, center.y, width / 2, height / 2, 0, 0, Math.PI * 2);
    } else {
      context.beginPath();
      context.rect(left, top, width, height);
    }
    context.fill();
    context.stroke();
    context.restore();
  };

  if (hoveredItem && hoveredItem.id !== hoverSkipId) {
    drawInteractionRect(hoveredItem, hoverStroke, hoverFill, 0.12);
  }
  if (selectedItem) {
    drawInteractionRect(selectedItem, selectionStroke, selectionFill, 0.12);
  }
}

function drawCanvasProfileContent(
  canvas: HTMLCanvasElement,
  snapshot: ProfileSnapshot,
  options: RenderOptions,
  equipment: readonly EquipmentItem[] = [],
  report?: EquipmentConstraintReport,
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    logger.warn("2d canvas context unavailable", { canvasId: canvas.id });
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const scale = createCanvasProfileScale(canvas, snapshot);
  const totalLength = snapshot.extents.totalLength;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, scale.width, scale.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, scale.width, scale.height);

  if (options.showGrid) {
    drawGrid(context, scale, totalLength);
  }

  context.save();
  context.strokeStyle = "#c47a13";
  context.lineWidth = 1.4;
  context.setLineDash([8, 6]);
  context.beginPath();
  const axisStart = scale.map({ right: -totalLength / 2, down: 0 });
  const axisEnd = scale.map({ right: totalLength / 2, down: 0 });
  context.moveTo(axisStart.x, axisStart.y);
  context.lineTo(axisEnd.x, axisEnd.y);
  context.stroke();
  context.restore();

  const shape = new Path2D();
  snapshot.smoothPoints.forEach((point, index) => {
    const projected = bodyPointToXzProjection({
      x: bodyXFromProfileS(point.s, totalLength),
      y: 0,
      z: -point.halfHeightZ,
    });
    const { x: px, y: py } = scale.map(projected);
    if (index === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  [...snapshot.smoothPoints].reverse().forEach((point) => {
    const projected = bodyPointToXzProjection({
      x: bodyXFromProfileS(point.s, totalLength),
      y: 0,
      z: point.halfHeightZ,
    });
    const screen = scale.map(projected);
    shape.lineTo(screen.x, screen.y);
  });
  shape.closePath();

  context.fillStyle = "rgba(15, 118, 110, 0.12)";
  context.strokeStyle = "#0f766e";
  context.lineWidth = 2.4;
  context.fill(shape);
  context.stroke(shape);

  drawEquipmentOverlay(context, scale, equipment, report);

  if (options.showPoints) {
    context.fillStyle = "#2563eb";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    snapshot.stationPoints.forEach((point) => {
      for (const radius of [point.topRadius, point.bottomRadius]) {
        const projected = bodyPointToXzProjection({
          x: bodyXFromProfileS(point.s, totalLength),
          y: 0,
          z: -radius,
        });
        const screen = scale.map(projected);
        context.beginPath();
        context.arc(screen.x, screen.y, 3.5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    });
  }

  context.fillStyle = "#17212b";
  context.font = "600 13px Segoe UI, Arial, sans-serif";
  const nose = scale.map({ right: totalLength / 2, down: 0 });
  const top = scale.map({ right: 0, down: -scale.yLimit });
  context.fillText("нос +X", nose.x - 52, nose.y - 10);
  context.fillText("X", nose.x + 10, nose.y + 4);
  context.fillText("−Z", top.x - 22, top.y + 4);
}
