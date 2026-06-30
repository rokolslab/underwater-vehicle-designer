import { describe, expect, it } from "vitest";
import formulaFixture from "../../../tests/fixtures/formula-profile.json";
import { getExtents, makeProfileSnapshot, makeSmoothPoints, makeStationPoints, radiusAt } from "./profile";

describe("profile geometry", () => {
  it("matches formula fixture radii", () => {
    for (const point of formulaFixture.points) {
      expect(radiusAt(point.x, formulaFixture.length, formulaFixture.diameter)).toBeCloseTo(point.radius, 12);
    }
  });

  it("preserves half-step and endpoint station contract", () => {
    const points = makeStationPoints(formulaFixture.length, formulaFixture.diameter, formulaFixture.stations);

    expect(points).toHaveLength(23);
    expect(points[0].x).toBe(0);
    expect(points[1].x).toBeCloseTo(0.15, 12);
    expect(points.at(-2)?.x).toBeCloseTo(5.85, 12);
    expect(points.at(-1)?.x).toBe(6);
  });

  it("matches sampled extents used by the current UI", () => {
    const extents = getExtents(makeSmoothPoints(formulaFixture.length, formulaFixture.diameter));

    expect(extents.maxRadius).toBeCloseTo(formulaFixture.extents.maxRadius, 12);
    expect(extents.maxHeight).toBeCloseTo(formulaFixture.extents.maxHeight, 12);
    expect(extents.maxX).toBeCloseTo(formulaFixture.extents.maxX, 12);
  });

  it("creates a shared immutable profile snapshot", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      slenderness: 3,
      diameter: 2,
      stations: 20,
      showGrid: true,
      showPoints: true,
    });

    expect(snapshot.state.diameter).toBe(2);
    expect(snapshot.smoothPoints).toHaveLength(321);
    expect(snapshot.stationPoints).toHaveLength(23);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});
