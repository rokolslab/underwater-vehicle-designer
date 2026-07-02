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
      expect(section.x).toBeCloseTo(station.x, 12);
      expect(section.radius).toBeCloseTo(station.yTop, 12);
    });
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