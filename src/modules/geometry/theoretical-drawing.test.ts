import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "./profile";
import type { ProfileState } from "./model";
import { makeTheoreticalDrawing } from "./theoretical-drawing";

const baseState: ProfileState = Object.freeze({
  length: 6,
  slenderness: 3,
  diameter: 2,
  cylindricalInsertLength: 0,
  stations: 8,
  showGrid: true,
  showPoints: true,
});

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
    });
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
      if (sourcePoint) {
        const expected = Math.sqrt(Math.max(0, sourcePoint.radius * sourcePoint.radius - curve.value * curve.value));
        expect(curve.points[Math.floor(curve.points.length / 2)].radius).toBeCloseTo(expected, 12);
      }
    }
  });

  it("creates symmetric waterlines and positive buttocks", () => {
    const drawing = makeTheoreticalDrawing(makeProfileSnapshot(baseState));

    expect(drawing.waterlines).toHaveLength(9);
    expect(drawing.buttocks).toHaveLength(5);
    expect(drawing.waterlines[0].value).toBeCloseTo(-drawing.maxRadius, 12);
    expect(drawing.waterlines.at(-1)?.value).toBeCloseTo(drawing.maxRadius, 12);
    expect(drawing.waterlines[4].value).toBe(0);
    expect(drawing.buttocks[0].value).toBe(0);
    expect(drawing.buttocks.at(-1)?.value).toBeCloseTo(drawing.maxRadius, 12);
  });
});