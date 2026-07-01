import type { ProfileSnapshot } from "../geometry/model";
import { formatNumber } from "../../shared/format";
import { logger } from "../../shared/logger";

interface CanvasScale {
  readonly mapX: (x: number) => number;
  readonly mapY: (y: number) => number;
  readonly width: number;
  readonly height: number;
  readonly yLimit: number;
}

export function resizeCanvas(canvas: HTMLCanvasElement): void {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  logger.debug("canvas resized", { width: canvas.width, height: canvas.height, ratio });
}

function createScale(canvas: HTMLCanvasElement, snapshot: ProfileSnapshot): CanvasScale {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.width / ratio;
  const height = canvas.height / ratio;
  const totalLength = snapshot.extents.totalLength;
  const yLimit = Math.max(snapshot.extents.maxRadius * 1.24, snapshot.state.diameter * 0.08, 0.1);
  const padding = { left: 54, right: 28, top: 30, bottom: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const scale = Math.min(innerW / totalLength, innerH / (2 * yLimit));
  const drawingW = totalLength * scale;
  const originX = padding.left + (innerW - drawingW) / 2;
  const originY = padding.top + innerH / 2;
  logger.debug("canvas scale created", {
    totalLength,
    cylindricalInsertLength: snapshot.state.cylindricalInsertLength,
    yLimit,
    scale,
  });

  return {
    mapX: (x) => originX + x * scale,
    mapY: (y) => originY - y * scale,
    width,
    height,
    yLimit,
  };
}

function drawGrid(context: CanvasRenderingContext2D, scale: CanvasScale, totalLength: number): void {
  context.save();
  context.strokeStyle = "#e2e8e1";
  context.lineWidth = 1;
  context.fillStyle = "#6d7a75";
  context.font = "12px Segoe UI, Arial, sans-serif";

  for (let index = 0; index <= 10; index += 1) {
    const x = (totalLength * index) / 10;
    const px = scale.mapX(x);
    context.beginPath();
    context.moveTo(px, 26);
    context.lineTo(px, scale.height - 36);
    context.stroke();
    context.fillText(formatNumber(x, 1), px - 10, scale.height - 14);
  }

  for (let index = -4; index <= 4; index += 1) {
    const y = (scale.yLimit * index) / 4;
    const py = scale.mapY(y);
    context.beginPath();
    context.moveTo(42, py);
    context.lineTo(scale.width - 24, py);
    context.stroke();
    if (index !== 0) context.fillText(formatNumber(y, 1), 8, py + 4);
  }

  context.restore();
}

export function renderCanvasProfile(canvas: HTMLCanvasElement, snapshot: ProfileSnapshot): void {
  resizeCanvas(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    logger.warn("2d canvas context unavailable", { canvasId: canvas.id });
    return;
  }

  const ratio = window.devicePixelRatio || 1;
  const scale = createScale(canvas, snapshot);
  const totalLength = snapshot.extents.totalLength;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, scale.width, scale.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, scale.width, scale.height);

  if (snapshot.state.showGrid) {
    drawGrid(context, scale, totalLength);
  }

  context.save();
  context.strokeStyle = "#c47a13";
  context.lineWidth = 1.4;
  context.setLineDash([8, 6]);
  context.beginPath();
  context.moveTo(scale.mapX(0), scale.mapY(0));
  context.lineTo(scale.mapX(totalLength), scale.mapY(0));
  context.stroke();
  context.restore();

  const shape = new Path2D();
  snapshot.smoothPoints.forEach((point, index) => {
    const px = scale.mapX(point.x);
    const py = scale.mapY(point.y);
    if (index === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  });
  [...snapshot.smoothPoints].reverse().forEach((point) => {
    shape.lineTo(scale.mapX(point.x), scale.mapY(-point.y));
  });
  shape.closePath();

  context.fillStyle = "rgba(15, 118, 110, 0.12)";
  context.strokeStyle = "#0f766e";
  context.lineWidth = 2.4;
  context.fill(shape);
  context.stroke(shape);

  if (snapshot.state.showPoints) {
    context.fillStyle = "#2563eb";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    snapshot.stationPoints.forEach((point) => {
      for (const y of [point.yTop, point.yBottom]) {
        context.beginPath();
        context.arc(scale.mapX(point.x), scale.mapY(y), 3.5, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    });
  }

  context.fillStyle = "#17212b";
  context.font = "600 13px Segoe UI, Arial, sans-serif";
  context.fillText("L", scale.mapX(totalLength) - 8, scale.mapY(0) - 10);
  context.fillText("x", scale.mapX(totalLength) + 10, scale.mapY(0) + 4);
  context.fillText("y", scale.mapX(0) - 22, scale.mapY(scale.yLimit) + 4);
}