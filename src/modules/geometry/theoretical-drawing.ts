import type { ProfileSnapshot, ProfilePoint } from "./model";

export interface TheoreticalGridLine {
  readonly value: number;
  readonly label: string;
}

export interface TheoreticalCurve {
  readonly value: number;
  readonly label: string;
  readonly points: readonly ProfilePoint[];
}

export type TheoreticalBodySectionSide = "forward" | "aft" | "midship";

export interface TheoreticalSection {
  readonly index: number;
  readonly s: number;
  readonly radius: number;
  readonly side: TheoreticalBodySectionSide;
}

export interface TheoreticalDrawing {
  readonly title: string;
  readonly totalLength: number;
  readonly maxRadius: number;
  readonly maxHeight: number;
  readonly midshipS: number;
  readonly profilePoints: readonly ProfilePoint[];
  readonly halfBreadthPoints: readonly ProfilePoint[];
  readonly profileButtockCurves: readonly TheoreticalCurve[];
  readonly halfBreadthWaterlineCurves: readonly TheoreticalCurve[];
  readonly sections: readonly TheoreticalSection[];
  readonly forwardSections: readonly TheoreticalSection[];
  readonly aftSections: readonly TheoreticalSection[];
  readonly midshipSections: readonly TheoreticalSection[];
  readonly waterlines: readonly TheoreticalGridLine[];
  readonly buttocks: readonly TheoreticalGridLine[];
}

const gridDivisions = 4;

function formatGridLabel(value: number): string {
  if (Math.abs(value) < 1e-9) return "0";
  return value.toFixed(2);
}

function makeSymmetricGrid(maxValue: number): readonly TheoreticalGridLine[] {
  if (maxValue <= 0) return Object.freeze([{ value: 0, label: "0" }]);

  const lines: TheoreticalGridLine[] = [];
  for (let index = -gridDivisions; index <= gridDivisions; index += 1) {
    const value = (maxValue * index) / gridDivisions;
    lines.push(Object.freeze({ value, label: formatGridLabel(value) }));
  }
  return Object.freeze(lines);
}

function makePositiveGrid(maxValue: number): readonly TheoreticalGridLine[] {
  if (maxValue <= 0) return Object.freeze([{ value: 0, label: "0" }]);

  const lines: TheoreticalGridLine[] = [];
  for (let index = 0; index <= gridDivisions; index += 1) {
    const value = (maxValue * index) / gridDivisions;
    lines.push(Object.freeze({ value, label: formatGridLabel(value) }));
  }
  return Object.freeze(lines);
}

function classifyBodyPlanSide(s: number, midshipS: number, totalLength: number): TheoreticalBodySectionSide {
  const tolerance = Math.max(totalLength, 1) * 1e-9;
  if (Math.abs(s - midshipS) <= tolerance) return "midship";
  return s < midshipS ? "forward" : "aft";
}

function makeOffsetCurve(points: readonly ProfilePoint[], offset: number): readonly ProfilePoint[] {
  const tolerance = 1e-9;
  return Object.freeze(
    points
      .filter((point) => point.radius + tolerance >= offset)
      .map((point) =>
        Object.freeze({
          s: point.s,
          radius: Math.sqrt(Math.max(0, point.radius * point.radius - offset * offset)),
        }),
      ),
  );
}

function makeSectionCurves(lines: readonly TheoreticalGridLine[], points: readonly ProfilePoint[], maxRadius: number): readonly TheoreticalCurve[] {
  const tolerance = Math.max(maxRadius, 1) * 1e-9;
  return Object.freeze(
    lines
      .filter((line) => line.value > tolerance && line.value < maxRadius - tolerance)
      .map((line) =>
        Object.freeze({
          value: line.value,
          label: line.label,
          points: makeOffsetCurve(points, line.value),
        }),
      )
      .filter((curve) => curve.points.length >= 2),
  );
}

export function makeTheoreticalDrawing(snapshot: ProfileSnapshot): TheoreticalDrawing {
  const totalLength = snapshot.extents.totalLength;
  const maxRadius = snapshot.extents.maxRadius;
  const midshipS = totalLength / 2;
  const waterlines = makeSymmetricGrid(maxRadius);
  const buttocks = makePositiveGrid(maxRadius);
  const sections = snapshot.stationPoints.map((point, index) =>
    Object.freeze({
      index: index + 1,
      s: point.s,
      radius: Math.max(0, point.topRadius),
      side: classifyBodyPlanSide(point.s, midshipS, totalLength),
    }),
  );
  const halfBreadthPoints = Object.freeze(snapshot.smoothPoints.map((point) => Object.freeze({ s: point.s, radius: point.radius })));

  return Object.freeze({
    title: "Теоретический чертеж корпуса",
    totalLength,
    maxRadius,
    maxHeight: snapshot.extents.maxHeight,
    midshipS,
    profilePoints: Object.freeze([...snapshot.smoothPoints]),
    halfBreadthPoints,
    profileButtockCurves: makeSectionCurves(buttocks, snapshot.smoothPoints, maxRadius),
    halfBreadthWaterlineCurves: makeSectionCurves(
      waterlines.filter((line) => line.value >= 0),
      snapshot.smoothPoints,
      maxRadius,
    ),
    sections: Object.freeze(sections),
    forwardSections: Object.freeze(sections.filter((section) => section.side === "forward")),
    aftSections: Object.freeze(sections.filter((section) => section.side === "aft")),
    midshipSections: Object.freeze(sections.filter((section) => section.side === "midship")),
    waterlines,
    buttocks,
  });
}