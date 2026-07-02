import type { SmoothPoint } from "../geometry/model";
import type { TheoreticalDrawing } from "../geometry/theoretical-drawing";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const width = 1200;
const height = 720;
const profileRect: Rect = Object.freeze({ x: 90, y: 82, width: 760, height: 220 });
const halfBreadthRect: Rect = Object.freeze({ x: 90, y: 372, width: 760, height: 150 });
const bodyPlanRect: Rect = Object.freeze({ x: 900, y: 82, width: 250, height: 440 });

function svgPath(points: readonly SmoothPoint[], mapX: (value: number) => number, mapY: (value: number) => number): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${mapX(point.x).toFixed(2)} ${mapY(point.y).toFixed(2)}`).join(" ");
}

function profileMaps(drawing: TheoreticalDrawing, rect: Rect): { mapX: (value: number) => number; mapY: (value: number) => number } {
  const yLimit = Math.max(drawing.maxRadius * 1.12, 0.1);
  const scale = Math.min(rect.width / drawing.totalLength, rect.height / (2 * yLimit));
  const drawingWidth = drawing.totalLength * scale;
  const originX = rect.x + (rect.width - drawingWidth) / 2;
  const originY = rect.y + rect.height / 2;
  return {
    mapX: (value) => originX + value * scale,
    mapY: (value) => originY - value * scale,
  };
}

function halfBreadthMaps(drawing: TheoreticalDrawing, rect: Rect): { mapX: (value: number) => number; mapY: (value: number) => number } {
  const scale = Math.min(rect.width / drawing.totalLength, (rect.height - 22) / Math.max(drawing.maxRadius, 0.1));
  const drawingWidth = drawing.totalLength * scale;
  const originX = rect.x + (rect.width - drawingWidth) / 2;
  const originY = rect.y + rect.height - 16;
  return {
    mapX: (value) => originX + value * scale,
    mapY: (value) => originY - value * scale,
  };
}

function renderProfile(drawing: TheoreticalDrawing): string {
  const { mapX, mapY } = profileMaps(drawing, profileRect);
  const top = svgPath(drawing.profilePoints, mapX, mapY);
  const bottom = svgPath([...drawing.profilePoints].reverse().map((point) => ({ x: point.x, y: -point.y })), mapX, mapY).replace(/^M/, "L");
  const stations = drawing.sections
    .map((section) => `<line x1="${mapX(section.x).toFixed(2)}" y1="${profileRect.y}" x2="${mapX(section.x).toFixed(2)}" y2="${profileRect.y + profileRect.height}" class="grid" />`)
    .join("\n    ");
  const waterlines = drawing.waterlines
    .map((line) => `<line x1="${profileRect.x}" y1="${mapY(line.value).toFixed(2)}" x2="${profileRect.x + profileRect.width}" y2="${mapY(line.value).toFixed(2)}" class="grid" />`)
    .join("\n    ");

  return `<g>
    <text x="${profileRect.x}" y="${profileRect.y - 16}" class="panel-title">Профиль</text>
    <rect x="${profileRect.x}" y="${profileRect.y}" width="${profileRect.width}" height="${profileRect.height}" class="frame" />
    ${stations}
    ${waterlines}
    <line x1="${mapX(0).toFixed(2)}" y1="${mapY(0).toFixed(2)}" x2="${mapX(drawing.totalLength).toFixed(2)}" y2="${mapY(0).toFixed(2)}" class="axis" />
    <path d="${top} ${bottom} Z" class="hull-fill" />
  </g>`;
}

function renderHalfBreadth(drawing: TheoreticalDrawing): string {
  const { mapX, mapY } = halfBreadthMaps(drawing, halfBreadthRect);
  const stations = drawing.sections
    .map((section) => `<line x1="${mapX(section.x).toFixed(2)}" y1="${halfBreadthRect.y}" x2="${mapX(section.x).toFixed(2)}" y2="${halfBreadthRect.y + halfBreadthRect.height}" class="grid" />`)
    .join("\n    ");
  const buttocks = drawing.buttocks
    .map((line) => `<line x1="${halfBreadthRect.x}" y1="${mapY(line.value).toFixed(2)}" x2="${halfBreadthRect.x + halfBreadthRect.width}" y2="${mapY(line.value).toFixed(2)}" class="grid" />`)
    .join("\n    ");
  const path = svgPath(drawing.halfBreadthPoints, mapX, mapY);

  return `<g>
    <text x="${halfBreadthRect.x}" y="${halfBreadthRect.y - 16}" class="panel-title">План / полуширота</text>
    <rect x="${halfBreadthRect.x}" y="${halfBreadthRect.y}" width="${halfBreadthRect.width}" height="${halfBreadthRect.height}" class="frame" />
    ${stations}
    ${buttocks}
    <line x1="${mapX(0).toFixed(2)}" y1="${mapY(0).toFixed(2)}" x2="${mapX(drawing.totalLength).toFixed(2)}" y2="${mapY(0).toFixed(2)}" class="axis" />
    <path d="${path}" class="hull-line" />
  </g>`;
}

function renderBodyPlan(drawing: TheoreticalDrawing): string {
  const radius = Math.min(bodyPlanRect.width, bodyPlanRect.height) * 0.42;
  const scale = radius / Math.max(drawing.maxRadius, 0.1);
  const cx = bodyPlanRect.x + bodyPlanRect.width / 2;
  const cy = bodyPlanRect.y + bodyPlanRect.height / 2;
  const waterlines = drawing.waterlines
    .map((line) => `<line x1="${bodyPlanRect.x + 8}" y1="${(cy - line.value * scale).toFixed(2)}" x2="${bodyPlanRect.x + bodyPlanRect.width - 8}" y2="${(cy - line.value * scale).toFixed(2)}" class="grid" />`)
    .join("\n    ");
  const buttocks = drawing.buttocks
    .flatMap((line) => [-1, 1].map((sign) => cx + sign * line.value * scale))
    .map((x) => `<line x1="${x.toFixed(2)}" y1="${bodyPlanRect.y + 8}" x2="${x.toFixed(2)}" y2="${bodyPlanRect.y + bodyPlanRect.height - 8}" class="grid" />`)
    .join("\n    ");
  const sections = drawing.sections
    .map((section) => `<circle cx="${cx}" cy="${cy}" r="${Math.max(0.6, section.radius * scale).toFixed(2)}" class="section" />`)
    .join("\n    ");

  return `<g>
    <text x="${bodyPlanRect.x}" y="${bodyPlanRect.y - 16}" class="panel-title">Сечения</text>
    <rect x="${bodyPlanRect.x}" y="${bodyPlanRect.y}" width="${bodyPlanRect.width}" height="${bodyPlanRect.height}" class="frame" />
    ${waterlines}
    ${buttocks}
    <line x1="${cx}" y1="${bodyPlanRect.y + 10}" x2="${cx}" y2="${bodyPlanRect.y + bodyPlanRect.height - 10}" class="axis" />
    <line x1="${bodyPlanRect.x + 10}" y1="${cy}" x2="${bodyPlanRect.x + bodyPlanRect.width - 10}" y2="${cy}" class="axis" />
    ${sections}
    <circle cx="${cx}" cy="${cy}" r="${(drawing.maxRadius * scale).toFixed(2)}" class="hull-circle" />
  </g>`;
}

export function buildTheoreticalDrawingSvg(drawing: TheoreticalDrawing): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .sheet { fill: #fff; stroke: #9aa99c; stroke-width: 1.2; }
    .frame { fill: none; stroke: #d7ded5; stroke-width: 1; }
    .grid { stroke: #d7ded5; stroke-width: 1; }
    .axis { stroke: #c47a13; stroke-width: 1.4; stroke-dasharray: 8 6; }
    .hull-fill { fill: rgba(15, 118, 110, 0.08); stroke: #0f766e; stroke-width: 2; }
    .hull-line { fill: none; stroke: #0f766e; stroke-width: 2; }
    .hull-circle { fill: none; stroke: #0f766e; stroke-width: 2; }
    .section { fill: none; stroke: rgba(15, 118, 110, 0.36); stroke-width: 1.2; }
    text { font-family: Segoe UI, Arial, sans-serif; fill: #17212b; }
    .title { font-size: 18px; font-weight: 700; }
    .meta { font-size: 13px; fill: #62717f; }
    .panel-title { font-size: 13px; font-weight: 700; }
  </style>
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" class="sheet" />
  <text x="24" y="38" class="title">${drawing.title}</text>
  <text x="955" y="38" class="meta">L=${drawing.totalLength.toFixed(3)} м; D=${drawing.maxHeight.toFixed(3)} м</text>
  ${renderProfile(drawing)}
  ${renderHalfBreadth(drawing)}
  ${renderBodyPlan(drawing)}
</svg>`;
}