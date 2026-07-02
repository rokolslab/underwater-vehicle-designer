import type { TheoreticalDrawing } from "../geometry/theoretical-drawing";
import { formatNumber } from "../../shared/format";
import { logger } from "../../shared/logger";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface DrawingLayout {
  readonly width: number;
  readonly height: number;
  readonly profile: Rect;
  readonly halfBreadth: Rect;
  readonly bodyPlan: Rect;
}

const ink = "#17212b";
const muted = "#62717f";
const line = "#d7ded5";
const strongLine = "#9aa99c";
const hull = "#0f766e";
const amber = "#c47a13";

function resizeCanvas(canvas: HTMLCanvasElement): { width: number; height: number; ratio: number } {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  canvas.width = width;
  canvas.height = height;
  return { width: width / ratio, height: height / ratio, ratio };
}

function makeLayout(width: number, height: number): DrawingLayout {
  const margin = 24;
  const bodyWidth = Math.min(260, Math.max(188, width * 0.28));
  const leftWidth = Math.max(280, width - bodyWidth - margin * 3);
  const profileHeight = Math.max(170, height * 0.36);
  const halfBreadthHeight = Math.max(128, height * 0.25);

  return Object.freeze({
    width,
    height,
    profile: Object.freeze({ x: margin + 46, y: 56, width: leftWidth - 46, height: profileHeight }),
    halfBreadth: Object.freeze({ x: margin + 46, y: 86 + profileHeight, width: leftWidth - 46, height: halfBreadthHeight }),
    bodyPlan: Object.freeze({ x: margin * 2 + leftWidth, y: 56, width: bodyWidth, height: profileHeight + halfBreadthHeight + 30 }),
  });
}

function drawText(context: CanvasRenderingContext2D, text: string, x: number, y: number, weight = 500): void {
  context.save();
  context.fillStyle = ink;
  context.font = `${weight} 12px Segoe UI, Arial, sans-serif`;
  context.fillText(text, x, y);
  context.restore();
}

function drawSheet(context: CanvasRenderingContext2D, layout: DrawingLayout, drawing: TheoreticalDrawing): void {
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, layout.width, layout.height);
  context.strokeStyle = strongLine;
  context.lineWidth = 1.2;
  context.strokeRect(10, 10, layout.width - 20, layout.height - 20);

  context.fillStyle = ink;
  context.font = "700 16px Segoe UI, Arial, sans-serif";
  context.fillText(drawing.title, 24, 34);
  context.fillStyle = muted;
  context.font = "12px Segoe UI, Arial, sans-serif";
  context.fillText(`L=${formatNumber(drawing.totalLength, 3)} м; D=${formatNumber(drawing.maxHeight, 3)} м`, layout.width - 214, 34);
}

function strokeRect(context: CanvasRenderingContext2D, rect: Rect): void {
  context.strokeStyle = line;
  context.lineWidth = 1;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
}

function drawProfile(context: CanvasRenderingContext2D, rect: Rect, drawing: TheoreticalDrawing): void {
  const yLimit = Math.max(drawing.maxRadius * 1.12, 0.1);
  const scale = Math.min(rect.width / drawing.totalLength, rect.height / (2 * yLimit));
  const drawingWidth = drawing.totalLength * scale;
  const originX = rect.x + (rect.width - drawingWidth) / 2;
  const originY = rect.y + rect.height / 2;
  const mapX = (x: number) => originX + x * scale;
  const mapY = (y: number) => originY - y * scale;

  strokeRect(context, rect);
  drawText(context, "Профиль", rect.x, rect.y - 10, 700);

  context.save();
  context.strokeStyle = line;
  context.lineWidth = 1;
  for (const section of drawing.sections) {
    const x = mapX(section.x);
    context.beginPath();
    context.moveTo(x, rect.y);
    context.lineTo(x, rect.y + rect.height);
    context.stroke();
  }
  for (const waterline of drawing.waterlines) {
    const y = mapY(waterline.value);
    context.beginPath();
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = amber;
  context.setLineDash([8, 6]);
  context.beginPath();
  context.moveTo(mapX(0), mapY(0));
  context.lineTo(mapX(drawing.totalLength), mapY(0));
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "rgba(15, 118, 110, 0.08)";
  context.strokeStyle = hull;
  context.lineWidth = 2;
  context.beginPath();
  drawing.profilePoints.forEach((point, index) => {
    const x = mapX(point.x);
    const y = mapY(point.y);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  [...drawing.profilePoints].reverse().forEach((point) => context.lineTo(mapX(point.x), mapY(-point.y)));
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = muted;
  context.font = "11px Segoe UI, Arial, sans-serif";
  context.fillText("0", mapX(0) - 4, rect.y + rect.height + 16);
  context.fillText("L", mapX(drawing.totalLength) - 8, rect.y + rect.height + 16);
  context.fillText("WL", rect.x - 28, mapY(0) + 4);
  context.restore();
}

function drawHalfBreadth(context: CanvasRenderingContext2D, rect: Rect, drawing: TheoreticalDrawing): void {
  const scale = Math.min(rect.width / drawing.totalLength, (rect.height - 22) / Math.max(drawing.maxRadius, 0.1));
  const drawingWidth = drawing.totalLength * scale;
  const originX = rect.x + (rect.width - drawingWidth) / 2;
  const originY = rect.y + rect.height - 16;
  const mapX = (x: number) => originX + x * scale;
  const mapY = (y: number) => originY - y * scale;

  strokeRect(context, rect);
  drawText(context, "План / полуширота", rect.x, rect.y - 10, 700);

  context.save();
  context.strokeStyle = line;
  context.lineWidth = 1;
  for (const section of drawing.sections) {
    const x = mapX(section.x);
    context.beginPath();
    context.moveTo(x, rect.y);
    context.lineTo(x, rect.y + rect.height);
    context.stroke();
  }
  for (const buttock of drawing.buttocks) {
    const y = mapY(buttock.value);
    context.beginPath();
    context.moveTo(rect.x, y);
    context.lineTo(rect.x + rect.width, y);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = amber;
  context.setLineDash([8, 6]);
  context.beginPath();
  context.moveTo(mapX(0), mapY(0));
  context.lineTo(mapX(drawing.totalLength), mapY(0));
  context.stroke();
  context.restore();

  context.save();
  context.strokeStyle = hull;
  context.lineWidth = 2;
  context.beginPath();
  drawing.halfBreadthPoints.forEach((point, index) => {
    const x = mapX(point.x);
    const y = mapY(point.y);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = muted;
  context.font = "11px Segoe UI, Arial, sans-serif";
  context.fillText("CL", rect.x - 28, mapY(0) + 4);
  context.fillText("B/2", rect.x - 32, mapY(drawing.maxRadius) + 4);
  context.restore();
}

function drawBodyPlan(context: CanvasRenderingContext2D, rect: Rect, drawing: TheoreticalDrawing): void {
  const radius = Math.min(rect.width, rect.height) * 0.42;
  const scale = radius / Math.max(drawing.maxRadius, 0.1);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  strokeRect(context, rect);
  drawText(context, "Сечения", rect.x, rect.y - 10, 700);

  context.save();
  context.strokeStyle = line;
  context.lineWidth = 1;
  for (const waterline of drawing.waterlines) {
    const y = cy - waterline.value * scale;
    context.beginPath();
    context.moveTo(rect.x + 8, y);
    context.lineTo(rect.x + rect.width - 8, y);
    context.stroke();
  }
  for (const buttock of drawing.buttocks) {
    const dx = buttock.value * scale;
    for (const sign of [-1, 1]) {
      const x = cx + sign * dx;
      context.beginPath();
      context.moveTo(x, rect.y + 8);
      context.lineTo(x, rect.y + rect.height - 8);
      context.stroke();
    }
  }
  context.restore();

  context.save();
  context.strokeStyle = amber;
  context.setLineDash([8, 6]);
  context.beginPath();
  context.moveTo(cx, rect.y + 10);
  context.lineTo(cx, rect.y + rect.height - 10);
  context.moveTo(rect.x + 10, cy);
  context.lineTo(rect.x + rect.width - 10, cy);
  context.stroke();
  context.restore();

  context.save();
  context.strokeStyle = "rgba(15, 118, 110, 0.36)";
  context.lineWidth = 1.2;
  for (const section of drawing.sections) {
    const sectionRadius = Math.max(0.6, section.radius * scale);
    context.beginPath();
    context.arc(cx, cy, sectionRadius, 0, Math.PI * 2);
    context.stroke();
  }
  context.strokeStyle = hull;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(cx, cy, drawing.maxRadius * scale, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = muted;
  context.font = "11px Segoe UI, Arial, sans-serif";
  context.fillText("Y", cx + drawing.maxRadius * scale + 8, cy + 4);
  context.fillText("Z", cx + 6, cy - drawing.maxRadius * scale - 8);
  context.restore();
}

export function renderTheoreticalDrawing(canvas: HTMLCanvasElement, drawing: TheoreticalDrawing): void {
  const { width, height, ratio } = resizeCanvas(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    logger.warn("theoretical drawing canvas context unavailable", { canvasId: canvas.id });
    return;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const layout = makeLayout(width, height);
  drawSheet(context, layout, drawing);
  drawProfile(context, layout.profile, drawing);
  drawHalfBreadth(context, layout.halfBreadth, drawing);
  drawBodyPlan(context, layout.bodyPlan, drawing);

  logger.debug("theoretical drawing rendered", {
    width,
    height,
    sectionCount: drawing.sections.length,
    waterlineCount: drawing.waterlines.length,
    buttockCount: drawing.buttocks.length,
  });
}