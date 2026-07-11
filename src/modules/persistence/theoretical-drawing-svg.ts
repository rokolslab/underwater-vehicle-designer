import type { ProfilePoint } from "../geometry/model";
import type { TheoreticalCurve, TheoreticalDrawing, TheoreticalSection } from "../geometry/theoretical-drawing";
import { bodyXFromProfileS } from "../../shared/body-coordinates";
import { logger } from "../../shared/logger";
import { bodyPointToXyProjection, bodyPointToXzProjection, bodyPointToYzProjection } from "../rendering/coordinate-adapter";

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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

const width = 1200;
const height = 720;
const profileRect: Rect = Object.freeze({ x: 90, y: 82, width: 760, height: 240 });
const halfBreadthRect: Rect = Object.freeze({ x: 90, y: 382, width: 760, height: 170 });
const bodyPlanRect: Rect = Object.freeze({ x: 900, y: 82, width: 250, height: 240 });
const minimumLength = 0.1;
const minimumRadius = 0.1;

function svgPath(points: readonly ProfilePoint[], mapX: (value: number) => number, mapY: (value: number) => number): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${mapX(point.s).toFixed(2)} ${mapY(point.radius).toFixed(2)}`).join(" ");
}

function makeProjectionScale(drawing: TheoreticalDrawing): ProjectionScale {
  const totalLength = Math.max(drawing.totalLength, minimumLength);
  const maxRadius = Math.max(drawing.maxRadius, minimumRadius);
  const yLimit = Math.max(drawing.maxRadius * 1.12, minimumRadius);
  const bodyRadiusLimit = Math.max(4, Math.min(bodyPlanRect.width / 2 - 18, bodyPlanRect.height / 2 - 18));
  const unit = Math.max(
    1e-6,
    Math.min(
      profileRect.width / totalLength,
      profileRect.height / (2 * yLimit),
      halfBreadthRect.width / totalLength,
      (halfBreadthRect.height - 22) / maxRadius,
      bodyRadiusLimit / maxRadius,
    ),
  );
  return Object.freeze({
    unit,
    profileOriginX: profileRect.x + profileRect.width / 2,
    profileOriginY: profileRect.y + profileRect.height / 2,
    halfBreadthOriginX: halfBreadthRect.x + halfBreadthRect.width / 2,
    halfBreadthOriginY: halfBreadthRect.y + 16,
    bodyCenterX: bodyPlanRect.x + bodyPlanRect.width / 2,
    bodyCenterY: bodyPlanRect.y + bodyPlanRect.height / 2,
  });
}

function profileMaps(scale: ProjectionScale, totalLength: number): { mapX: (value: number) => number; mapY: (value: number) => number } {
  return {
    mapX: (s) => scale.profileOriginX + bodyPointToXzProjection({ x: bodyXFromProfileS(s, totalLength), y: 0, z: 0 }).right * scale.unit,
    mapY: (radius) => scale.profileOriginY + bodyPointToXzProjection({ x: 0, y: 0, z: -radius }).down * scale.unit,
  };
}

function halfBreadthMaps(scale: ProjectionScale, totalLength: number): { mapX: (value: number) => number; mapY: (value: number) => number } {
  return {
    mapX: (s) => scale.halfBreadthOriginX + bodyPointToXyProjection({ x: bodyXFromProfileS(s, totalLength), y: 0, z: 0 }).right * scale.unit,
    mapY: (radius) => scale.halfBreadthOriginY + bodyPointToXyProjection({ x: 0, y: radius, z: 0 }).down * scale.unit,
  };
}

function profileCurvePaths(curves: readonly TheoreticalCurve[], mapX: (value: number) => number, mapY: (value: number) => number): string {
  return curves
    .flatMap((curve) => [
      svgPath(curve.points, mapX, mapY),
      svgPath(
        curve.points.map((point) => ({ s: point.s, radius: -point.radius })),
        mapX,
        mapY,
      ),
    ])
    .filter((path) => path.length > 0)
    .map((path) => `<path d="${path}" class="section-curve" />`)
    .join("\n    ");
}

function halfBreadthCurvePaths(curves: readonly TheoreticalCurve[], mapX: (value: number) => number, mapY: (value: number) => number): string {
  return curves
    .map((curve) => svgPath(curve.points, mapX, mapY))
    .filter((path) => path.length > 0)
    .map((path) => `<path d="${path}" class="section-curve" />`)
    .join("\n    ");
}

function renderProfile(drawing: TheoreticalDrawing, scale: ProjectionScale): string {
  const { mapX, mapY } = profileMaps(scale, drawing.totalLength);
  const top = svgPath(drawing.profilePoints, mapX, mapY);
  const bottom = svgPath([...drawing.profilePoints].reverse().map((point) => ({ s: point.s, radius: -point.radius })), mapX, mapY).replace(/^M/, "L");
  const stations = drawing.sections
    .map((section) => `<line x1="${mapX(section.s).toFixed(2)}" y1="${profileRect.y}" x2="${mapX(section.s).toFixed(2)}" y2="${profileRect.y + profileRect.height}" class="grid" />`)
    .join("\n    ");
  const waterlines = drawing.waterlines
    .map((line) => `<line x1="${profileRect.x}" y1="${mapY(line.value).toFixed(2)}" x2="${profileRect.x + profileRect.width}" y2="${mapY(line.value).toFixed(2)}" class="grid" />`)
    .join("\n    ");
  const internalCurves = profileCurvePaths(drawing.profileButtockCurves, mapX, mapY);

  return `<g>
    <text x="${profileRect.x}" y="${profileRect.y - 16}" class="panel-title">Бок</text>
    <rect x="${profileRect.x}" y="${profileRect.y}" width="${profileRect.width}" height="${profileRect.height}" class="frame" />
    ${stations}
    ${waterlines}
    <line x1="${mapX(0).toFixed(2)}" y1="${mapY(0).toFixed(2)}" x2="${mapX(drawing.totalLength).toFixed(2)}" y2="${mapY(0).toFixed(2)}" class="axis" />
    <path d="${top} ${bottom} Z" class="hull-fill" />
    ${internalCurves}
    <text x="${mapX(0).toFixed(2)}" y="${profileRect.y + profileRect.height - 8}" text-anchor="end" class="meta">нос (+X)</text>
    <text x="${profileRect.x + 8}" y="${profileRect.y + profileRect.height - 8}" class="meta">+Z вниз</text>
  </g>`;
}

function renderHalfBreadth(drawing: TheoreticalDrawing, scale: ProjectionScale): string {
  const { mapX, mapY } = halfBreadthMaps(scale, drawing.totalLength);
  const stations = drawing.sections
    .map((section) => `<line x1="${mapX(section.s).toFixed(2)}" y1="${halfBreadthRect.y}" x2="${mapX(section.s).toFixed(2)}" y2="${halfBreadthRect.y + halfBreadthRect.height}" class="grid" />`)
    .join("\n    ");
  const buttocks = drawing.buttocks
    .map((line) => `<line x1="${halfBreadthRect.x}" y1="${mapY(line.value).toFixed(2)}" x2="${halfBreadthRect.x + halfBreadthRect.width}" y2="${mapY(line.value).toFixed(2)}" class="grid" />`)
    .join("\n    ");
  const path = svgPath(drawing.halfBreadthPoints, mapX, mapY);
  const internalCurves = halfBreadthCurvePaths(drawing.halfBreadthWaterlineCurves, mapX, mapY);

  return `<g>
    <text x="${halfBreadthRect.x}" y="${halfBreadthRect.y - 16}" class="panel-title">Полуширота</text>
    <rect x="${halfBreadthRect.x}" y="${halfBreadthRect.y}" width="${halfBreadthRect.width}" height="${halfBreadthRect.height}" class="frame" />
    ${stations}
    ${buttocks}
    <line x1="${mapX(0).toFixed(2)}" y1="${mapY(0).toFixed(2)}" x2="${mapX(drawing.totalLength).toFixed(2)}" y2="${mapY(0).toFixed(2)}" class="axis" />
    ${internalCurves}
    <path d="${path}" class="hull-line" />
    <text x="${halfBreadthRect.x + 8}" y="${halfBreadthRect.y + halfBreadthRect.height - 8}" class="meta">+Y правый борт</text>
  </g>`;
}

function sectionArcPath(section: TheoreticalSection, cx: number, cy: number, unit: number): string {
  const radius = Math.max(0.6, section.radius * unit);
  const topY = cy - radius;
  const bottomY = cy + radius;
  if (section.side === "aft") {
    return `M${cx.toFixed(2)} ${bottomY.toFixed(2)} A${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${cx.toFixed(2)} ${topY.toFixed(2)}`;
  }
  if (section.side === "forward") {
    return `M${cx.toFixed(2)} ${topY.toFixed(2)} A${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${cx.toFixed(2)} ${bottomY.toFixed(2)}`;
  }
  return `M${cx.toFixed(2)} ${topY.toFixed(2)} A${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${cx.toFixed(2)} ${bottomY.toFixed(2)} M${cx.toFixed(2)} ${bottomY.toFixed(2)} A${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 1 ${cx.toFixed(2)} ${topY.toFixed(2)}`;
}

function maxBodyArcPath(drawing: TheoreticalDrawing, scale: ProjectionScale): string {
  const section = Object.freeze({ index: 0, s: drawing.midshipS, radius: drawing.maxRadius, side: "midship" as const });
  return sectionArcPath(section, scale.bodyCenterX, scale.bodyCenterY, scale.unit);
}

function renderBodyPlan(drawing: TheoreticalDrawing, scale: ProjectionScale): string {
  const cx = scale.bodyCenterX;
  const cy = scale.bodyCenterY;
  const waterlines = drawing.waterlines
    .map((line) => {
      const y = cy + bodyPointToYzProjection({ x: 0, y: 0, z: line.value }).down * scale.unit;
      return `<line x1="${bodyPlanRect.x + 8}" y1="${y.toFixed(2)}" x2="${bodyPlanRect.x + bodyPlanRect.width - 8}" y2="${y.toFixed(2)}" class="grid" />`;
    })
    .join("\n    ");
  const buttocks = drawing.buttocks
    .flatMap((line) => [-1, 1].map((sign) => cx + bodyPointToYzProjection({ x: 0, y: sign * line.value, z: 0 }).right * scale.unit))
    .map((x) => `<line x1="${x.toFixed(2)}" y1="${bodyPlanRect.y + 8}" x2="${x.toFixed(2)}" y2="${bodyPlanRect.y + bodyPlanRect.height - 8}" class="grid" />`)
    .join("\n    ");
  const aftSections = drawing.aftSections
    .map((section) => `<path d="${sectionArcPath(section, cx, cy, scale.unit)}" class="section-aft" />`)
    .join("\n    ");
  const forwardSections = drawing.forwardSections
    .map((section) => `<path d="${sectionArcPath(section, cx, cy, scale.unit)}" class="section-forward" />`)
    .join("\n    ");
  const midshipSections = drawing.midshipSections
    .map((section) => `<path d="${sectionArcPath(section, cx, cy, scale.unit)}" class="section-midship" />`)
    .join("\n    ");
  const maxOutline = drawing.midshipSections.length === 0 ? `<path d="${maxBodyArcPath(drawing, scale)}" class="section-midship" />` : "";

  return `<g>
    <text x="${bodyPlanRect.x}" y="${bodyPlanRect.y - 16}" class="panel-title">Корпус</text>
    <rect x="${bodyPlanRect.x}" y="${bodyPlanRect.y}" width="${bodyPlanRect.width}" height="${bodyPlanRect.height}" class="frame" />
    ${waterlines}
    ${buttocks}
    <line x1="${cx}" y1="${bodyPlanRect.y + 10}" x2="${cx}" y2="${bodyPlanRect.y + bodyPlanRect.height - 10}" class="axis" />
    <line x1="${bodyPlanRect.x + 10}" y1="${cy}" x2="${bodyPlanRect.x + bodyPlanRect.width - 10}" y2="${cy}" class="axis" />
    <text x="${bodyPlanRect.x + 12}" y="${bodyPlanRect.y + 18}" class="meta">левый борт</text>
    <text x="${bodyPlanRect.x + bodyPlanRect.width - 118}" y="${bodyPlanRect.y + 18}" class="meta">правый борт (+Y)</text>
    <text x="${cx + 6}" y="${bodyPlanRect.y + bodyPlanRect.height - 12}" class="meta">+Z вниз</text>
    ${aftSections}
    ${forwardSections}
    ${midshipSections}
    ${maxOutline}
  </g>`;
}

export function buildTheoreticalDrawingSvg(drawing: TheoreticalDrawing): string {
  const scale = makeProjectionScale(drawing);

  if (drawing.profilePoints.length < 2 || drawing.totalLength <= 0 || drawing.maxRadius <= 0) {
    logger.warn("theoretical drawing SVG has empty or invalid geometry", {
      exportView: "theoretical-drawing", projectionFrames: ["Body/XZ", "Body/XY", "Body/YZ"],
      totalLength: drawing.totalLength, maxRadius: drawing.maxRadius,
      pointCount: drawing.profilePoints.length,
    });
  }
  logger.debug("theoretical drawing SVG built", {
    exportView: "theoretical-drawing", projectionFrames: ["Body/XZ", "Body/XY", "Body/YZ"],
    bodyXRange: [-drawing.totalLength / 2, drawing.totalLength / 2],
    radialRange: [-drawing.maxRadius, drawing.maxRadius],
    sectionCount: drawing.sections.length,
    curveCount: drawing.profileButtockCurves.length + drawing.halfBreadthWaterlineCurves.length,
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <style>
    .sheet { fill: #fff; stroke: #9aa99c; stroke-width: 1.2; }
    .frame { fill: none; stroke: #d7ded5; stroke-width: 1; }
    .grid { stroke: #d7ded5; stroke-width: 1; }
    .axis { stroke: #c47a13; stroke-width: 1.4; stroke-dasharray: 8 6; }
    .hull-fill { fill: rgba(15, 118, 110, 0.08); stroke: #0f766e; stroke-width: 2; }
    .hull-line { fill: none; stroke: #0f766e; stroke-width: 2; }
    .section-curve { fill: none; stroke: rgba(23, 33, 43, 0.34); stroke-width: 1; }
    .section-forward { fill: none; stroke: rgba(15, 118, 110, 0.42); stroke-width: 1.2; }
    .section-aft { fill: none; stroke: rgba(37, 99, 235, 0.34); stroke-width: 1.2; }
    .section-midship { fill: none; stroke: #0f766e; stroke-width: 2; }
    text { font-family: Segoe UI, Arial, sans-serif; fill: #17212b; }
    .title { font-size: 18px; font-weight: 700; }
    .meta { font-size: 13px; fill: #62717f; }
    .panel-title { font-size: 13px; font-weight: 700; }
  </style>
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" class="sheet" />
  <text x="24" y="38" class="title">${drawing.title}</text>
  <text x="955" y="38" class="meta">L=${drawing.totalLength.toFixed(3)} м; D=${drawing.maxHeight.toFixed(3)} м</text>
  ${renderProfile(drawing, scale)}
  ${renderHalfBreadth(drawing, scale)}
  ${renderBodyPlan(drawing, scale)}
</svg>`;
}
