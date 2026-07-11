import type { ProfilePoint } from "../geometry/model";
import type { TheoreticalCurve, TheoreticalDrawing, TheoreticalSection } from "../geometry/theoretical-drawing";
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

interface ProjectionScale {
  readonly unit: number;
  readonly profileOriginX: number;
  readonly profileOriginY: number;
  readonly halfBreadthOriginX: number;
  readonly halfBreadthOriginY: number;
  readonly bodyCenterX: number;
  readonly bodyCenterY: number;
}

const ink = "#17212b";
const muted = "#62717f";
const line = "#d7ded5";
const strongLine = "#9aa99c";
const hull = "#0f766e";
const amber = "#c47a13";
const sectionCurve = "rgba(23, 33, 43, 0.34)";
const forwardSection = "rgba(15, 118, 110, 0.42)";
const aftSection = "rgba(37, 99, 235, 0.34)";
const minimumLength = 0.1;
const minimumRadius = 0.1;

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
  const topY = 56;
  const bottomMargin = 30;
  const rowGap = 42;
  const bodyWidth = Math.min(260, Math.max(188, width * 0.24));
  const leftWidth = Math.max(300, width - bodyWidth - margin * 3);
  const availableHeight = Math.max(360, height - topY - bottomMargin);
  const profileHeight = Math.max(180, Math.min(260, availableHeight * 0.48));
  const halfBreadthHeight = Math.max(128, availableHeight - profileHeight - rowGap);

  return Object.freeze({
    width,
    height,
    profile: Object.freeze({ x: margin + 46, y: topY, width: leftWidth - 46, height: profileHeight }),
    halfBreadth: Object.freeze({ x: margin + 46, y: topY + profileHeight + rowGap, width: leftWidth - 46, height: halfBreadthHeight }),
    bodyPlan: Object.freeze({ x: margin * 2 + leftWidth, y: topY, width: bodyWidth, height: profileHeight }),
  });
}

function makeProjectionScale(layout: DrawingLayout, drawing: TheoreticalDrawing): ProjectionScale {
  const totalLength = Math.max(drawing.totalLength, minimumLength);
  const maxRadius = Math.max(drawing.maxRadius, minimumRadius);
  const yLimit = Math.max(drawing.maxRadius * 1.12, minimumRadius);
  const bodyRadiusLimit = Math.max(4, Math.min(layout.bodyPlan.width / 2 - 18, layout.bodyPlan.height / 2 - 18));
  const unit = Math.max(
    1e-6,
    Math.min(
      layout.profile.width / totalLength,
      layout.profile.height / (2 * yLimit),
      layout.halfBreadth.width / totalLength,
      (layout.halfBreadth.height - 22) / maxRadius,
      bodyRadiusLimit / maxRadius,
    ),
  );
  const drawingWidth = drawing.totalLength * unit;

  return Object.freeze({
    unit,
    profileOriginX: layout.profile.x + (layout.profile.width - drawingWidth) / 2,
    profileOriginY: layout.profile.y + layout.profile.height / 2,
    halfBreadthOriginX: layout.halfBreadth.x + (layout.halfBreadth.width - drawingWidth) / 2,
    halfBreadthOriginY: layout.halfBreadth.y + layout.halfBreadth.height - 16,
    bodyCenterX: layout.bodyPlan.x + layout.bodyPlan.width / 2,
    bodyCenterY: layout.bodyPlan.y + layout.bodyPlan.height / 2,
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

function drawPolyline(
  context: CanvasRenderingContext2D,
  points: readonly ProfilePoint[],
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): void {
  if (points.length < 2) return;

  context.beginPath();
  points.forEach((point, index) => {
    const x = mapX(point.s);
    const y = mapY(point.radius);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

function drawProfileSectionCurves(
  context: CanvasRenderingContext2D,
  curves: readonly TheoreticalCurve[],
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): void {
  context.save();
  context.strokeStyle = sectionCurve;
  context.lineWidth = 1;
  for (const curve of curves) {
    drawPolyline(context, curve.points, mapX, mapY);
    drawPolyline(
      context,
      curve.points.map((point) => ({ s: point.s, radius: -point.radius })),
      mapX,
      mapY,
    );
  }
  context.restore();
}

function drawHalfBreadthSectionCurves(
  context: CanvasRenderingContext2D,
  curves: readonly TheoreticalCurve[],
  mapX: (x: number) => number,
  mapY: (y: number) => number,
): void {
  context.save();
  context.strokeStyle = sectionCurve;
  context.lineWidth = 1;
  for (const curve of curves) drawPolyline(context, curve.points, mapX, mapY);
  context.restore();
}

function drawProfile(context: CanvasRenderingContext2D, rect: Rect, drawing: TheoreticalDrawing, scale: ProjectionScale): void {
  const mapX = (x: number) => scale.profileOriginX + x * scale.unit;
  const mapY = (y: number) => scale.profileOriginY - y * scale.unit;

  strokeRect(context, rect);
  drawText(context, "Бок", rect.x, rect.y - 10, 700);

  context.save();
  context.strokeStyle = line;
  context.lineWidth = 1;
  for (const section of drawing.sections) {
    const x = mapX(section.s);
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
    const x = mapX(point.s);
    const y = mapY(point.radius);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  [...drawing.profilePoints].reverse().forEach((point) => context.lineTo(mapX(point.s), mapY(-point.radius)));
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();

  drawProfileSectionCurves(context, drawing.profileButtockCurves, mapX, mapY);

  context.save();
  context.fillStyle = muted;
  context.font = "11px Segoe UI, Arial, sans-serif";
  context.fillText("0", mapX(0) - 4, rect.y + rect.height + 16);
  context.fillText("L", mapX(drawing.totalLength) - 8, rect.y + rect.height + 16);
  context.fillText("WL", rect.x - 28, mapY(0) + 4);
  context.restore();
}

function drawHalfBreadth(context: CanvasRenderingContext2D, rect: Rect, drawing: TheoreticalDrawing, scale: ProjectionScale): void {
  const mapX = (x: number) => scale.halfBreadthOriginX + x * scale.unit;
  const mapY = (y: number) => scale.halfBreadthOriginY - y * scale.unit;

  strokeRect(context, rect);
  drawText(context, "Полуширота", rect.x, rect.y - 10, 700);

  context.save();
  context.strokeStyle = line;
  context.lineWidth = 1;
  for (const section of drawing.sections) {
    const x = mapX(section.s);
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

  drawHalfBreadthSectionCurves(context, drawing.halfBreadthWaterlineCurves, mapX, mapY);

  context.save();
  context.strokeStyle = hull;
  context.lineWidth = 2;
  drawPolyline(context, drawing.halfBreadthPoints, mapX, mapY);
  context.restore();

  context.save();
  context.fillStyle = muted;
  context.font = "11px Segoe UI, Arial, sans-serif";
  context.fillText("CL", rect.x - 28, mapY(0) + 4);
  context.fillText("B/2", rect.x - 32, mapY(drawing.maxRadius) + 4);
  context.restore();
}

function drawBodySectionArc(
  context: CanvasRenderingContext2D,
  section: TheoreticalSection,
  cx: number,
  cy: number,
  unit: number,
): void {
  const radius = Math.max(0.6, section.radius * unit);
  context.beginPath();
  if (section.side === "aft") {
    context.arc(cx, cy, radius, Math.PI / 2, Math.PI * 1.5);
  } else if (section.side === "forward") {
    context.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
  } else {
    context.arc(cx, cy, radius, -Math.PI / 2, Math.PI / 2);
    context.moveTo(cx, cy + radius);
    context.arc(cx, cy, radius, Math.PI / 2, Math.PI * 1.5);
  }
  context.stroke();
}

function drawBodyPlan(context: CanvasRenderingContext2D, rect: Rect, drawing: TheoreticalDrawing, scale: ProjectionScale): void {
  const cx = scale.bodyCenterX;
  const cy = scale.bodyCenterY;

  strokeRect(context, rect);
  drawText(context, "Корпус", rect.x, rect.y - 10, 700);

  context.save();
  context.strokeStyle = line;
  context.lineWidth = 1;
  for (const waterline of drawing.waterlines) {
    const y = cy - waterline.value * scale.unit;
    context.beginPath();
    context.moveTo(rect.x + 8, y);
    context.lineTo(rect.x + rect.width - 8, y);
    context.stroke();
  }
  for (const buttock of drawing.buttocks) {
    const dx = buttock.value * scale.unit;
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
  context.lineWidth = 1.2;
  context.strokeStyle = aftSection;
  for (const section of drawing.aftSections) drawBodySectionArc(context, section, cx, cy, scale.unit);
  context.strokeStyle = forwardSection;
  for (const section of drawing.forwardSections) drawBodySectionArc(context, section, cx, cy, scale.unit);
  context.strokeStyle = hull;
  context.lineWidth = 2;
  for (const section of drawing.midshipSections) drawBodySectionArc(context, section, cx, cy, scale.unit);
  if (drawing.midshipSections.length === 0) {
    const maxRadius = drawing.maxRadius * scale.unit;
    context.beginPath();
    context.arc(cx, cy, maxRadius, -Math.PI / 2, Math.PI / 2);
    context.moveTo(cx, cy + maxRadius);
    context.arc(cx, cy, maxRadius, Math.PI / 2, Math.PI * 1.5);
    context.stroke();
  }
  context.restore();

  context.save();
  context.fillStyle = muted;
  context.font = "11px Segoe UI, Arial, sans-serif";
  context.fillText("корма", rect.x + 12, rect.y + 18);
  context.fillText("нос", rect.x + rect.width - 36, rect.y + 18);
  context.fillText("Y", cx + drawing.maxRadius * scale.unit + 8, cy + 4);
  context.fillText("Z", cx + 6, cy - drawing.maxRadius * scale.unit - 8);
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
  const scale = makeProjectionScale(layout, drawing);
  drawSheet(context, layout, drawing);
  drawProfile(context, layout.profile, drawing, scale);
  drawHalfBreadth(context, layout.halfBreadth, drawing, scale);
  drawBodyPlan(context, layout.bodyPlan, drawing, scale);

  logger.debug("theoretical drawing rendered", {
    width,
    height,
    scale: scale.unit,
    sectionCount: drawing.sections.length,
    profileButtockCurveCount: drawing.profileButtockCurves.length,
    halfBreadthWaterlineCurveCount: drawing.halfBreadthWaterlineCurves.length,
    forwardSectionCount: drawing.forwardSections.length,
    aftSectionCount: drawing.aftSections.length,
    midshipSectionCount: drawing.midshipSections.length,
    waterlineCount: drawing.waterlines.length,
    buttockCount: drawing.buttocks.length,
  });
}