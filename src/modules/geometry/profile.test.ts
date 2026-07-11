import { describe, expect, it } from "vitest";
import formulaFixture from "../../../tests/fixtures/formula-profile.json";
import {
  getExtents,
  makeProfileSnapshot,
  makeProfilePoints,
  makeStationPoints,
  maxRadiusS,
  profileRadiusAt,
  radiusAt,
  totalProfileLength,
} from "./profile";

describe("profile geometry", () => {
  it("treats diameter as the physical maximum hull height", () => {
    const diameter = 2;
    const s = maxRadiusS(6);

    expect(radiusAt(s, 6, diameter)).toBeCloseTo(diameter / 2, 12);
  });
  it("matches formula fixture radii", () => {
    for (const point of formulaFixture.points) {
      expect(radiusAt(point.s, formulaFixture.length, formulaFixture.diameter)).toBeCloseTo(point.radius, 12);
      expect(profileRadiusAt(point.s, formulaFixture.length, formulaFixture.diameter, 0)).toBeCloseTo(point.radius, 12);
    }
  });

  it("preserves half-step and endpoint station contract when insert length is zero", () => {
    const points = makeStationPoints(formulaFixture.length, formulaFixture.diameter, formulaFixture.stations);

    expect(points).toHaveLength(23);
    expect(points[0].s).toBe(0);
    expect(points[1].s).toBeCloseTo(0.15, 12);
    expect(points.at(-2)?.s).toBeCloseTo(5.85, 12);
    expect(points.at(-1)?.s).toBe(6);
  });

  it("matches sampled extents used by the current UI when insert length is zero", () => {
    const extents = getExtents(makeProfilePoints(formulaFixture.length, formulaFixture.diameter));

    expect(extents.maxRadius).toBeCloseTo(formulaFixture.extents.maxRadius, 12);
    expect(extents.maxHeight).toBeCloseTo(formulaFixture.extents.maxHeight, 12);
    expect(extents.maxRadiusS).toBeCloseTo(formulaFixture.extents.maxRadiusS, 12);
    expect(extents.totalLength).toBe(formulaFixture.length);
  });

  it("adds a cylindrical insert after the maximum-radius station", () => {
    const length = 6;
    const diameter = 2;
    const cylindricalInsertLength = 2;
    const sourceLength = length - cylindricalInsertLength;
    const insertStart = maxRadiusS(sourceLength);
    const insertEnd = insertStart + cylindricalInsertLength;
    const maxRadius = radiusAt(insertStart, sourceLength, diameter);

    expect(totalProfileLength(length, cylindricalInsertLength)).toBe(6);
    expect(profileRadiusAt(insertStart + 1, length, diameter, cylindricalInsertLength)).toBeCloseTo(maxRadius, 12);
    expect(profileRadiusAt(insertEnd, length, diameter, cylindricalInsertLength)).toBeCloseTo(maxRadius, 12);
    expect(profileRadiusAt(insertEnd + 0.3, length, diameter, cylindricalInsertLength)).toBeCloseTo(
      radiusAt(insertStart + 0.3, sourceLength, diameter),
      12,
    );
    expect(profileRadiusAt(length, length, diameter, cylindricalInsertLength)).toBe(0);
  });

  it("uses total profile length for station points when insert is present", () => {
    const points = makeStationPoints(6, 2, 20, 2);

    expect(points[0].s).toBe(0);
    expect(points[1].s).toBeCloseTo(0.15, 12);
    expect(points.at(-2)?.s).toBeCloseTo(5.85, 12);
    expect(points.at(-1)?.s).toBe(6);
  });

  it("creates a shared immutable profile snapshot", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 20,
      showGrid: true,
      showPoints: true,
    });

    expect(snapshot.state.diameter).toBe(2);
    expect(snapshot.state.cylindricalInsertLength).toBe(2);
    expect(snapshot.extents.totalLength).toBe(6);
    expect(snapshot.smoothPoints).toHaveLength(321);
    expect(snapshot.stationPoints).toHaveLength(23);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
});