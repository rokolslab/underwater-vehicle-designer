import { describe, expect, it, vi } from "vitest";
import v1Fixture from "../../../tests/fixtures/project-v1-coordinate-migration.json";
import v2Fixture from "../../../tests/fixtures/project-v2-sname-ned.json";
import type { SerializableProjectState } from "./project-json";
import {
  buildProjectJson,
  parseProjectJson,
  projectJsonCoordinateSystem,
  projectJsonSchemaVersion,
} from "./project-json";

function parseFixture(value: unknown) {
  return parseProjectJson(JSON.stringify(value));
}

describe("project json persistence", () => {
  it("exports only canonical v2 and round-trips without migration", () => {
    const initial = parseFixture(v2Fixture);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;

    const json = buildProjectJson(initial.project);
    const raw = JSON.parse(json) as {
      schemaVersion: number;
      coordinateSystem: string;
      exportedAt: string;
      project: { profile: { geometryMode?: string } };
    };
    const roundTrip = parseProjectJson(json);

    expect(raw.schemaVersion).toBe(projectJsonSchemaVersion);
    expect(raw.coordinateSystem).toBe(projectJsonCoordinateSystem);
    expect(Date.parse(raw.exportedAt)).not.toBeNaN();
    expect(initial.project.profile.geometryMode).toBe("current-formula");
    expect(raw.project.profile.geometryMode).toBe("current-formula");
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    expect(roundTrip.migratedFromVersion).toBeUndefined();
    expect(roundTrip.warnings).toHaveLength(0);
    expect(roundTrip.project).toEqual(initial.project);
  });

  it("round-trips legacy geometry mode in v2", () => {
    const source = structuredClone(v2Fixture) as unknown as Record<string, any>;
    source.project.profile.geometryMode = "legacy-dsnp-pa";
    const initial = parseFixture(source);
    expect(initial.ok).toBe(true);
    if (!initial.ok) return;

    const json = buildProjectJson(initial.project);
    const raw = JSON.parse(json) as { project: { profile: { geometryMode?: string } } };
    const roundTrip = parseProjectJson(json);

    expect(initial.warnings).toHaveLength(0);
    expect(raw.project.profile.geometryMode).toBe("legacy-dsnp-pa");
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    expect(roundTrip.warnings).toHaveLength(0);
    expect(roundTrip.project.profile.geometryMode).toBe("legacy-dsnp-pa");
    expect(roundTrip.project).toEqual(initial.project);
  });

  it("defaults missing v2 geometry mode without warning", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const parsed = parseFixture(v2Fixture);

      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.warnings).toHaveLength(0);
      expect(parsed.project.profile.geometryMode).toBe("current-formula");
      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it("normalizes unsupported v2 geometry mode with warning", () => {
    const source = structuredClone(v2Fixture) as unknown as Record<string, any>;
    source.project.profile.geometryMode = "unsupported-mode";
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const parsed = parseFixture(source);

      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(parsed.warnings).toEqual(["project.profile.geometryMode normalized"]);
      expect(parsed.project.profile.geometryMode).toBe("current-formula");
      expect(consoleWarn).toHaveBeenCalledWith(
        "[WARN] project json geometry mode normalized",
        expect.objectContaining({ requested: "unsupported-mode", normalized: "current-formula" }),
      );
    } finally {
      consoleWarn.mockRestore();
    }
  });

  it("migrates known v1 points, cylinder axes, and non-cubic box dimensions", () => {
    const result = parseFixture(v1Fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.migratedFromVersion).toBe(1);
    expect(result.warnings).toContainEqual(expect.stringContaining("старая ось z"));
    expect(result.project.profile.geometryMode).toBe("current-formula");
    expect(result.project.equipment[0]).toMatchObject({ position: { x: 5, y: 3, z: -2 }, orientation: "x" });
    expect(result.project.equipment[1]).toMatchObject({ position: { x: -5, y: -3, z: 2 }, orientation: "z" });
    expect(result.project.equipment[2]).toMatchObject({ position: { x: 0, y: -2.5, z: -1.5 }, orientation: "y" });
    expect(result.project.equipment[3]).toMatchObject({
      position: { x: 1, y: 0.75, z: 0.25 },
      dimensions: { lengthX: 1.2, breadthY: 3.4, heightZ: 2.3 },
    });
    expect(result.project.scene3dSettings.section).toEqual({ type: "crossSectionX", x: 3 });
  });

  it("normalizes v1 profile length before applying position and section migration", () => {
    const legacy = structuredClone(v1Fixture) as unknown as Record<string, any>;
    legacy.project.profile.length = -10;
    legacy.project.equipment[0].position.x = 0;
    legacy.project.scene3dSettings.section = { type: "crossSectionX", x: 0 };
    const result = parseFixture(legacy);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.profile.length).toBe(0.1);
    expect(result.project.equipment[0].position.x).toBe(0.05);
    expect(result.project.scene3dSettings.section).toEqual({ type: "crossSectionX", x: 0.05 });
  });

  it.each([
    ["xy", 0.35, { type: "longitudinalPlane", plane: "xz", offset: 0.35 }],
    ["xz", 0.35, { type: "longitudinalPlane", plane: "xy", offset: -0.35 }],
  ])("migrates legacy %s longitudinal plane", (plane, offset, expected) => {
    const legacy = structuredClone(v1Fixture) as unknown as Record<string, any>;
    legacy.project.scene3dSettings.section = { type: "longitudinalPlane", plane, offset };
    const result = parseFixture(legacy);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.project.scene3dSettings.section).toEqual(expected);
  });

  it("does not apply v1 conversion twice after migrated save/import", () => {
    const migrated = parseFixture(v1Fixture);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const secondImport = parseProjectJson(buildProjectJson(migrated.project));
    expect(secondImport.ok).toBe(true);
    if (!secondImport.ok) return;

    expect(secondImport.migratedFromVersion).toBeUndefined();
    expect(secondImport.warnings).toHaveLength(0);
    expect(secondImport.project).toEqual(migrated.project);
  });

  it("normalizes unsafe v2 fields without legacy migration", () => {
    const unsafe = structuredClone(v2Fixture) as unknown as Record<string, any>;
    unsafe.project.profile.length = -1;
    unsafe.project.profile.slenderness = 0;
    unsafe.project.profile.cylindricalInsertLength = 20;
    unsafe.project.profile.stations = 200;
    unsafe.project.equipment[0].massKg = -5;
    unsafe.project.equipment[0].position.x = "bad";
    unsafe.project.scene3dSettings = { mode: "bad", hullOpacity: 99, section: { type: "crossSectionX", x: 999 } };
    unsafe.project.balanceSettings = { waterDensityKgPerM3: -10, gravityMPerS2: "bad" };
    const parsed = parseFixture(unsafe);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.migratedFromVersion).toBeUndefined();
    expect(parsed.warnings.length).toBeGreaterThan(0);
    expect(parsed.project.profile).toMatchObject({ length: 0.1, slenderness: 0.1, diameter: 1, stations: 80 });
    expect(parsed.project.equipment[0].position.x).toBe(0);
    expect(parsed.project.scene3dSettings.section).toEqual({ type: "crossSectionX", x: 0.05 });
  });

  it.each([
    ["missing version", { project: {} }],
    ["unknown version", { schemaVersion: 0, project: {} }],
    ["future version", { schemaVersion: 3, coordinateSystem: projectJsonCoordinateSystem, project: {} }],
    ["missing v2 marker", { schemaVersion: 2, project: {} }],
    ["invalid v2 marker", { schemaVersion: 2, coordinateSystem: "OTHER", project: {} }],
  ])("rejects %s", (_label, document) => {
    expect(parseFixture(document).ok).toBe(false);
  });

  it("rejects invalid JSON and a v2 document without project", () => {
    expect(parseProjectJson("not json").ok).toBe(false);
    expect(parseFixture({ schemaVersion: 2, coordinateSystem: projectJsonCoordinateSystem }).ok).toBe(false);
  });

  it("accepts a typed project state for export", () => {
    const parsed = parseFixture(v2Fixture);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const project: SerializableProjectState = parsed.project;
    expect(JSON.parse(buildProjectJson(project))).toMatchObject({ schemaVersion: 2 });
  });
});
