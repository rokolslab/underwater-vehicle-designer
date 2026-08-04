import type { ProfilePoint, ProfileSnapshot } from "./model";
import {
  intersectSectionWithButtockY,
  intersectSectionWithWaterlineZ,
  sampleSectionContour,
  sectionShapeExtents,
  type SectionPointYZ,
} from "./section-shape";

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
  readonly contourPoints: readonly SectionPointYZ[];
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
  readonly maxSectionContourPoints: readonly SectionPointYZ[];
  readonly sections: readonly TheoreticalSection[];
  readonly forwardSections: readonly TheoreticalSection[];
  readonly aftSections: readonly TheoreticalSection[];
  readonly midshipSections: readonly TheoreticalSection[];
  readonly waterlines: readonly TheoreticalGridLine[];
  readonly buttocks: readonly TheoreticalGridLine[];
}

const gridDivisions = 4;
const bodyPlanContourSamples = 64;

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
  intersectionAxis: "buttockY" | "waterlineZ",
): readonly TheoreticalPoint[] {
  return Object.freeze(
    points
      .map((point) => {
        const intersections = intersectionAxis === "buttockY"
          ? intersectSectionWithButtockY(point.shape, offset)
          : intersectSectionWithWaterlineZ(point.shape, offset);
        if (intersections.length === 0) return undefined;

        const radius = Math.max(
          ...intersections.map((intersection) => Math.abs(intersectionAxis === "buttockY" ? intersection.z : intersection.y)),
        );
        return makeTheoreticalPoint(point.s, radius);
      })
      .filter((point): point is TheoreticalPoint => point !== undefined),
  );
}

function makeSectionCurves(
  lines: readonly TheoreticalGridLine[],
  points: readonly ProfilePoint[],
  maxSourceAxis: number,
  intersectionAxis: "buttockY" | "waterlineZ",
): readonly TheoreticalCurve[] {
  const tolerance = Math.max(maxSourceAxis, 1) * 1e-9;
  return Object.freeze(
    lines
      .filter((line) => line.value > tolerance && line.value < maxSourceAxis - tolerance)
      .map((line) =>
        Object.freeze({
          value: line.value,
          label: line.label,
          points: makeOffsetCurve(points, line.value, intersectionAxis),
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
  const maxSectionPoint = snapshot.smoothPoints.reduce<ProfilePoint | undefined>(
    (best, point) => (!best || point.radius > best.radius ? point : best),
    undefined,
  );
  const sections = snapshot.stationPoints.map((point, index) => {
    const extents = sectionShapeExtents(point.shape);
    return Object.freeze({
      index: index + 1,
      s: point.s,
      radius: extents.radius,
      halfBreadthY: extents.halfBreadthY,
      halfHeightZ: extents.halfHeightZ,
      contourPoints: sampleSectionContour(point.shape, bodyPlanContourSamples),
      side: classifyBodyPlanSide(point.s, midshipS, totalLength),
    });
  });
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
    profileButtockCurves: makeSectionCurves(buttocks, snapshot.smoothPoints, maxHalfBreadthY, "buttockY"),
    halfBreadthWaterlineCurves: makeSectionCurves(
      waterlines.filter((line) => line.value >= 0),
      snapshot.smoothPoints,
      maxHalfHeightZ,
      "waterlineZ",
    ),
    maxSectionContourPoints: maxSectionPoint ? sampleSectionContour(maxSectionPoint.shape, bodyPlanContourSamples) : Object.freeze([]),
    sections: Object.freeze(sections),
    forwardSections: Object.freeze(sections.filter((section) => section.side === "forward")),
    aftSections: Object.freeze(sections.filter((section) => section.side === "aft")),
    midshipSections: Object.freeze(sections.filter((section) => section.side === "midship")),
    waterlines,
    buttocks,
  });
}
