import type { ProfilePoint, ProfileSnapshot } from "./model";

export interface TheoreticalGridLine {
  readonly value: number;
  readonly label: string;
}

export interface TheoreticalPoint {
  readonly s: number;
  readonly radius: number;
}

export interface TheoreticalCurve {
  readonly value: number;
  readonly label: string;
  readonly points: readonly TheoreticalPoint[];
}

export type TheoreticalBodySectionSide = "forward" | "aft" | "midship";

export interface TheoreticalSection {
  readonly index: number;
  readonly s: number;
  /** Compatibility/display scalar in profile XZ projection. */
  readonly radius: number;
  readonly halfBreadthY: number;
  readonly halfHeightZ: number;
  readonly side: TheoreticalBodySectionSide;
}

export interface TheoreticalDrawing {
  readonly title: string;
  readonly totalLength: number;
  readonly maxRadius: number;
  readonly maxHalfBreadthY: number;
  readonly maxHalfHeightZ: number;
  readonly maxHeight: number;
  readonly midshipS: number;
  readonly profilePoints: readonly TheoreticalPoint[];
  readonly halfBreadthPoints: readonly TheoreticalPoint[];
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

function makeOffsetCurve(
  points: readonly ProfilePoint[],
  offset: number,
  sourceAxis: "halfBreadthY" | "halfHeightZ",
  targetAxis: "halfBreadthY" | "halfHeightZ",
): readonly TheoreticalPoint[] {
  const tolerance = 1e-9;
  return Object.freeze(
    points
      .filter((point) => point[sourceAxis] + tolerance >= offset)
      .map((point) => {
        const sourceExtent = Math.max(point[sourceAxis], tolerance);
        const targetExtent = point[targetAxis];
        const ratio = offset / sourceExtent;
        return Object.freeze({
          s: point.s,
          radius: targetExtent * Math.sqrt(Math.max(0, 1 - ratio * ratio)),
        });
      }),
  );
}

function makeSectionCurves(
  lines: readonly TheoreticalGridLine[],
  points: readonly ProfilePoint[],
  maxSourceAxis: number,
  sourceAxis: "halfBreadthY" | "halfHeightZ",
  targetAxis: "halfBreadthY" | "halfHeightZ",
): readonly TheoreticalCurve[] {
  const tolerance = Math.max(maxSourceAxis, 1) * 1e-9;
  return Object.freeze(
    lines
      .filter((line) => line.value > tolerance && line.value < maxSourceAxis - tolerance)
      .map((line) =>
        Object.freeze({
          value: line.value,
          label: line.label,
          points: makeOffsetCurve(points, line.value, sourceAxis, targetAxis),
        }),
      )
      .filter((curve) => curve.points.length >= 2),
  );
}

function makeTheoreticalPoint(s: number, radius: number): TheoreticalPoint {
  return Object.freeze({ s, radius });
}

export function makeTheoreticalDrawing(snapshot: ProfileSnapshot): TheoreticalDrawing {
  const totalLength = snapshot.extents.totalLength;
  const maxRadius = snapshot.extents.maxRadius;
  const maxHalfBreadthY = snapshot.extents.maxHalfBreadthY;
  const maxHalfHeightZ = snapshot.extents.maxHalfHeightZ;
  const midshipS = totalLength / 2;
  const waterlines = makeSymmetricGrid(maxHalfHeightZ);
  const buttocks = makePositiveGrid(maxHalfBreadthY);
  const sections = snapshot.stationPoints.map((point, index) =>
    Object.freeze({
      index: index + 1,
      s: point.s,
      radius: Math.max(0, point.halfHeightZ),
      halfBreadthY: Math.max(0, point.halfBreadthY),
      halfHeightZ: Math.max(0, point.halfHeightZ),
      side: classifyBodyPlanSide(point.s, midshipS, totalLength),
    }),
  );
  const profilePoints = Object.freeze(snapshot.smoothPoints.map((point) => makeTheoreticalPoint(point.s, point.halfHeightZ)));
  const halfBreadthPoints = Object.freeze(snapshot.smoothPoints.map((point) => makeTheoreticalPoint(point.s, point.halfBreadthY)));

  return Object.freeze({
    title: "Теоретический чертеж корпуса",
    totalLength,
    maxRadius,
    maxHalfBreadthY,
    maxHalfHeightZ,
    maxHeight: snapshot.extents.maxHeight,
    midshipS,
    profilePoints,
    halfBreadthPoints,
    profileButtockCurves: makeSectionCurves(buttocks, snapshot.smoothPoints, maxHalfBreadthY, "halfBreadthY", "halfHeightZ"),
    halfBreadthWaterlineCurves: makeSectionCurves(
      waterlines.filter((line) => line.value >= 0),
      snapshot.smoothPoints,
      maxHalfHeightZ,
      "halfHeightZ",
      "halfBreadthY",
    ),
    sections: Object.freeze(sections),
    forwardSections: Object.freeze(sections.filter((section) => section.side === "forward")),
    aftSections: Object.freeze(sections.filter((section) => section.side === "aft")),
    midshipSections: Object.freeze(sections.filter((section) => section.side === "midship")),
    waterlines,
    buttocks,
  });
}
