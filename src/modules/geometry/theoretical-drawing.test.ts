import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeProfileSnapshot } from "./profile";
import type { GeometryProfileState, ProfileSnapshot } from "./model";
import { intersectSectionWithButtockY, makeEllipseSectionShape, sectionShapeExtents } from "./section-shape";
import { makeTheoreticalDrawing } from "./theoretical-drawing";

const baseState: GeometryProfileState = Object.freeze({
  length: 6,
  breadth: 2,
  height: 2,
  slenderness: 3,
  diameter: 2,
  cylindricalInsertLength: 0,
  stations: 8,
});

function makeEllipticalSnapshot(): ProfileSnapshot {
  const snapshot = makeProfileSnapshot(baseState);
  return Object.freeze({
    ...snapshot,
    smoothPoints: Object.freeze(
      snapshot.smoothPoints.map((point) => {
        const shape = makeEllipseSectionShape(point.halfBreadthY * 2, point.halfHeightZ);
        return Object.freeze({ ...point, shape, ...sectionShapeExtents(shape) });
      }),
    ),
    stationPoints: Object.freeze(
      snapshot.stationPoints.map((point) => {
        const shape = makeEllipseSectionShape(point.halfBreadthY * 2, point.halfHeightZ);
        return Object.freeze({ ...point, shape, ...sectionShapeExtents(shape) });
      }),
    ),
    extents: Object.freeze({
      ...snapshot.extents,
      maxHalfBreadthY: snapshot.extents.maxHalfBreadthY * 2,
    }),
  });
}

describe("theoretical drawing geometry", () => {
  it("uses profile snapshot points without changing extents", () => {
    const snapshot = makeProfileSnapshot(baseState);
    const drawing = makeTheoreticalDrawing(snapshot);

    expect(drawing.totalLength).toBe(snapshot.extents.totalLength);
    expect(drawing.maxRadius).toBe(snapshot.extents.maxRadius);
    expect(drawing.maxHeight).toBe(snapshot.extents.maxHeight);
    expect(drawing.midshipS).toBe(snapshot.extents.totalLength / 2);
    expect(drawing.profilePoints).toHaveLength(snapshot.smoothPoints.length);
    expect(drawing.halfBreadthPoints).toHaveLength(snapshot.smoothPoints.length);
    expect(drawing.maxSectionContourPoints).toHaveLength(64);
  });

  it("creates station sections from snapshot station points", () => {
    const snapshot = makeProfileSnapshot(baseState);
    const drawing = makeTheoreticalDrawing(snapshot);

    expect(drawing.sections).toHaveLength(snapshot.stationPoints.length);
    drawing.sections.forEach((section, index) => {
      const station = snapshot.stationPoints[index];
      expect(section.index).toBe(index + 1);
      expect(section.s).toBeCloseTo(station.s, 12);
      expect(section.radius).toBeCloseTo(station.topRadius, 12);
      expect(section.halfBreadthY).toBeCloseTo(station.halfBreadthY, 12);
      expect(section.halfHeightZ).toBeCloseTo(station.halfHeightZ, 12);
      expect(section.contourPoints).toHaveLength(64);
    });
  });

  it("uses exact breadth and height axes from the snapshot for legacy-style sections", () => {
    const snapshot = makeEllipticalSnapshot();
    const drawing = makeTheoreticalDrawing(snapshot);

    expect(drawing.maxHalfBreadthY).toBeCloseTo(snapshot.extents.maxHalfBreadthY, 12);
    expect(drawing.maxHalfHeightZ).toBeCloseTo(snapshot.extents.maxHalfHeightZ, 12);
    drawing.halfBreadthPoints.forEach((point, index) => {
      expect(point.radius).toBeCloseTo(snapshot.smoothPoints[index].halfBreadthY, 12);
    });
    drawing.sections.forEach((section, index) => {
      expect(section.halfBreadthY).toBeCloseTo(snapshot.stationPoints[index].halfBreadthY, 12);
      expect(section.halfHeightZ).toBeCloseTo(snapshot.stationPoints[index].halfHeightZ, 12);
    });

    const curve = drawing.profileButtockCurves[0];
    const point = curve.points[Math.floor(curve.points.length / 2)];
    const sourcePoint = snapshot.smoothPoints.find((source) => source.s === point.s);
    expect(sourcePoint).toBeDefined();
    if (sourcePoint) {
      const expected = Math.max(...intersectSectionWithButtockY(sourcePoint.shape, curve.value).map((intersection) => Math.abs(intersection.z)));
      expect(point.radius).toBeCloseTo(expected, 12);
    }
  });

  it("splits body-plan sections around midship", () => {
    const drawing = makeTheoreticalDrawing(makeProfileSnapshot(baseState));

    expect(drawing.forwardSections.length).toBeGreaterThan(0);
    expect(drawing.aftSections.length).toBeGreaterThan(0);
    expect(drawing.midshipSections.length).toBe(1);
    expect(drawing.forwardSections.every((section) => section.side === "forward" && section.s < drawing.midshipS)).toBe(true);
    expect(drawing.aftSections.every((section) => section.side === "aft" && section.s > drawing.midshipS)).toBe(true);
    expect(drawing.midshipSections.every((section) => section.side === "midship" && section.s === drawing.midshipS)).toBe(true);
    expect(drawing.forwardSections.length + drawing.aftSections.length + drawing.midshipSections.length).toBe(drawing.sections.length);
  });

  it("creates internal section curves for profile and half-breadth views", () => {
    const snapshot = makeProfileSnapshot(baseState);
    const drawing = makeTheoreticalDrawing(snapshot);

    expect(drawing.profileButtockCurves).toHaveLength(3);
    expect(drawing.halfBreadthWaterlineCurves).toHaveLength(3);
    for (const curve of [...drawing.profileButtockCurves, ...drawing.halfBreadthWaterlineCurves]) {
      expect(curve.value).toBeGreaterThan(0);
      expect(curve.value).toBeLessThan(drawing.maxRadius);
      expect(curve.points.length).toBeGreaterThan(2);
      expect(curve.points.every((point) => point.radius >= 0 && point.radius <= drawing.maxRadius)).toBe(true);

      const sourcePoint = snapshot.smoothPoints.find((point) => point.s === curve.points[Math.floor(curve.points.length / 2)].s);
      expect(sourcePoint).toBeDefined();
    }
  });

  it("keeps section curves delegated to SectionShape helpers", () => {
    const source = readFileSync(join(process.cwd(), "src/modules/geometry/theoretical-drawing.ts"), "utf8");

    expect(source).toContain("intersectSectionWithButtockY");
    expect(source).toContain("intersectSectionWithWaterlineZ");
    expect(source).not.toContain("1 - ratio * ratio");
    expect(source).not.toMatch(/Math\.sqrt/u);
  });

  it("creates symmetric waterlines and positive buttocks", () => {
    const drawing = makeTheoreticalDrawing(makeProfileSnapshot(baseState));

    expect(drawing.waterlines).toHaveLength(9);
    expect(drawing.buttocks).toHaveLength(5);
    expect(drawing.waterlines[0].value).toBeCloseTo(-drawing.maxHalfHeightZ, 12);
    expect(drawing.waterlines.at(-1)?.value).toBeCloseTo(drawing.maxHalfHeightZ, 12);
    expect(drawing.waterlines[4].value).toBe(0);
    expect(drawing.buttocks[0].value).toBe(0);
    expect(drawing.buttocks.at(-1)?.value).toBeCloseTo(drawing.maxHalfBreadthY, 12);
  });
});
