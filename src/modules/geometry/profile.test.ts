import { describe, expect, it, vi } from "vitest";
import formulaFixture from "../../../tests/fixtures/formula-profile.json";
import {
  cylindricalInsertLengthToLegacyLc,
  legacyDsnpPaMaxHalfBreadth,
  legacyDsnpPaMaxHalfHeight,
  legacyDsnpPaSectionExtentsAt,
  profileStationToLegacyX,
} from "./legacy-dsnp-pa";
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

function expectedLegacyHalfAxis(normalizedX: number, normalizedLc: number, fullAxis: number): number {
  const plateauStart = 0.4 * (1 - normalizedLc);
  const plateauEnd = 0.4 + 0.6 * normalizedLc;
  if (normalizedX > plateauStart && normalizedX < plateauEnd) return fullAxis / 2;

  const profileX =
    normalizedX <= plateauStart ? normalizedX / (1 - normalizedLc) : (normalizedX - normalizedLc) / (1 - normalizedLc);
  return 0.9731 * fullAxis * Math.sqrt(profileX * (1 - profileX) * (1.5 - profileX));
}

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
    expect(extents.maxHalfBreadthY).toBeCloseTo(formulaFixture.extents.maxRadius, 12);
    expect(extents.maxHalfHeightZ).toBeCloseTo(formulaFixture.extents.maxRadius, 12);
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
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 20,
    });

    expect(snapshot.state.diameter).toBe(2);
    expect(snapshot.state.cylindricalInsertLength).toBe(2);
    expect(snapshot.state).not.toHaveProperty("showGrid");
    expect(snapshot.state).not.toHaveProperty("showPoints");
    expect(snapshot.extents.totalLength).toBe(6);
    expect(snapshot.extents.maxHalfBreadthY).toBeCloseTo(snapshot.extents.maxRadius, 12);
    expect(snapshot.extents.maxHalfHeightZ).toBeCloseTo(snapshot.extents.maxRadius, 12);
    expect(snapshot.smoothPoints).toHaveLength(321);
    expect(snapshot.stationPoints).toHaveLength(23);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("scales current formula sections by independent breadth and height", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      breadth: 4,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 1,
      stations: 20,
    });
    const maxPoint = snapshot.smoothPoints.find((point) => point.s === snapshot.extents.maxRadiusS);

    expect(snapshot.extents.maxHalfBreadthY).toBeCloseTo(2, 12);
    expect(snapshot.extents.maxHalfHeightZ).toBeCloseTo(1, 12);
    expect(snapshot.extents.maxRadius).toBeCloseTo(1, 12);
    expect(maxPoint?.halfBreadthY).toBeCloseTo(2, 12);
    expect(maxPoint?.halfHeightZ).toBeCloseTo(1, 12);
  });

  // Legacy regressions trace to docs/legacy/dsnp-pa-calculation-catalog.md and do not validate DSNP_PA coefficients.
  it("normalizes profile stations and cylindrical insert length for legacy DSNP_PA regressions", () => {
    expect(profileStationToLegacyX(2.5, 10)).toBeCloseTo(0.25, 12);
    expect(cylindricalInsertLengthToLegacyLc(2, 10)).toBeCloseTo(0.2, 12);
  });

  it("regresses documented legacy MaxWl/MaxBt nose, tail and plateau branches without validating DSNP_PA coefficients", () => {
    // Traceability: docs/legacy/dsnp-pa-calculation-catalog.md, APPAUNIT.PAS MaxBt/MaxWl.
    const normalizedLc = 0.2;
    const noseX = 0.16;
    const plateauX = 0.4;
    const tailX = 0.76;

    expect(legacyDsnpPaMaxHalfBreadth(noseX, normalizedLc, 3)).toBeCloseTo(
      expectedLegacyHalfAxis(noseX, normalizedLc, 3),
      12,
    );
    expect(legacyDsnpPaMaxHalfHeight(noseX, normalizedLc, 2)).toBeCloseTo(
      expectedLegacyHalfAxis(noseX, normalizedLc, 2),
      12,
    );
    expect(legacyDsnpPaMaxHalfBreadth(plateauX, normalizedLc, 3)).toBeCloseTo(1.5, 12);
    expect(legacyDsnpPaMaxHalfHeight(plateauX, normalizedLc, 2)).toBeCloseTo(1, 12);
    expect(legacyDsnpPaMaxHalfBreadth(tailX, normalizedLc, 3)).toBeCloseTo(
      expectedLegacyHalfAxis(tailX, normalizedLc, 3),
      12,
    );
    expect(legacyDsnpPaMaxHalfHeight(tailX, normalizedLc, 2)).toBeCloseTo(
      expectedLegacyHalfAxis(tailX, normalizedLc, 2),
      12,
    );
  });

  it("maps legacy MaxWl/MaxBt to exact section axes in the section extents API", () => {
    const section = legacyDsnpPaSectionExtentsAt({
      s: 4,
      length: 10,
      maxBreadth: 4,
      maxHeight: 2,
      cylindricalInsertLength: 2,
    });

    expect(section.halfBreadthY).toBeCloseTo(2, 12);
    expect(section.halfHeightZ).toBeCloseTo(1, 12);
    expect(section.radius).toBeCloseTo(section.halfHeightZ, 12);
  });

  it("keeps legacy cylindrical insert plateau and extents as regression traceability, not engineering validation", () => {
    const snapshot = makeProfileSnapshot({
      geometryMode: "legacy-dsnp-pa",
      length: 10,
      breadth: 2,
      height: 2,
      slenderness: 5,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 10,
    });
    const plateauPoint = snapshot.smoothPoints.find((point) => point.s === 4);

    expect(plateauPoint?.halfBreadthY).toBeCloseTo(1, 12);
    expect(plateauPoint?.halfHeightZ).toBeCloseTo(1, 12);
    expect(plateauPoint?.radius).toBeCloseTo(1, 12);
    expect(snapshot.extents.maxRadius).toBeCloseTo(Math.max(...snapshot.smoothPoints.map((point) => point.radius)), 12);
    expect(snapshot.extents.maxHalfBreadthY).toBeCloseTo(Math.max(...snapshot.smoothPoints.map((point) => point.halfBreadthY)), 12);
    expect(snapshot.extents.maxHalfHeightZ).toBeCloseTo(Math.max(...snapshot.smoothPoints.map((point) => point.halfHeightZ)), 12);
    expect(snapshot.extents.maxHeight).toBeCloseTo(snapshot.extents.maxHalfHeightZ * 2, 12);
    expect(snapshot.extents.totalLength).toBe(10);
  });

  it("passes breadth to legacy MaxWl and height to legacy MaxBt", () => {
    const snapshot = makeProfileSnapshot({
      geometryMode: "legacy-dsnp-pa",
      length: 10,
      breadth: 4,
      height: 2,
      slenderness: 5,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 10,
    });
    const plateauPoint = snapshot.smoothPoints.find((point) => point.s === 4);

    expect(plateauPoint?.halfBreadthY).toBeCloseTo(2, 12);
    expect(plateauPoint?.halfHeightZ).toBeCloseTo(1, 12);
    expect(plateauPoint?.radius).toBeCloseTo(1, 12);
  });

  it("does not write console output from pure profile snapshot calculation", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      makeProfileSnapshot({
        geometryMode: "legacy-dsnp-pa",
        length: 10,
        breadth: 4,
        height: 2,
        slenderness: 5,
        diameter: 2,
        cylindricalInsertLength: 2,
        stations: 10,
      });

      expect(consoleInfo).not.toHaveBeenCalled();
      expect(consoleDebug).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleInfo.mockRestore();
      consoleDebug.mockRestore();
      consoleWarn.mockRestore();
      consoleError.mockRestore();
    }
  });
});
