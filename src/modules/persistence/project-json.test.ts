import { describe, expect, it } from "vitest";
import type { SerializableProjectState } from "./project-json";
import { buildProjectJson, parseProjectJson, projectJsonSchemaVersion } from "./project-json";

const baseProject: SerializableProjectState = Object.freeze({
  profile: Object.freeze({
    length: 8,
    slenderness: 4,
    diameter: 2,
    cylindricalInsertLength: 1,
    stations: 24,
    showGrid: false,
    showPoints: true,
  }),
  equipment: Object.freeze([
    Object.freeze({
      id: "battery-1",
      name: "Battery",
      shape: "box" as const,
      massKg: 12,
      position: Object.freeze({ x: 3, y: 0.1, z: -0.2 }),
      orientation: "x" as const,
      dimensions: Object.freeze({ lengthX: 0.8, breadthY: 0.4, heightZ: 0.3 }),
      displacedVolume: 0.096,
    }),
    Object.freeze({
      id: "tank-1",
      name: "Tank",
      shape: "cylinder" as const,
      massKg: 5,
      position: Object.freeze({ x: 5, y: 0, z: 0.2 }),
      orientation: "z" as const,
      dimensions: Object.freeze({ radius: 0.2, length: 0.7 }),
    }),
  ]),
  scene3dSettings: Object.freeze({
    mode: "cutaway" as const,
    hullOpacity: 0.32,
    section: Object.freeze({ type: "longitudinalPlane" as const, plane: "xz" as const, offset: 0.15 }),
  }),
  balanceSettings: Object.freeze({ waterDensityKgPerM3: 1030, gravityMPerS2: 9.8 }),
});

describe("project json persistence", () => {
  it("exports a versioned project document and parses it back", () => {
    const json = buildProjectJson(baseProject);
    const raw = JSON.parse(json) as { schemaVersion: number; exportedAt: string };
    const parsed = parseProjectJson(json);

    expect(raw.schemaVersion).toBe(projectJsonSchemaVersion);
    expect(Date.parse(raw.exportedAt)).not.toBeNaN();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings).toHaveLength(0);
    expect(parsed.project.profile).toEqual(baseProject.profile);
    expect(parsed.project.equipment).toEqual(baseProject.equipment);
    expect(parsed.project.scene3dSettings).toEqual(baseProject.scene3dSettings);
    expect(parsed.project.balanceSettings).toEqual(baseProject.balanceSettings);
  });

  it("normalizes unsafe numeric fields while preserving import", () => {
    const parsed = parseProjectJson(
      JSON.stringify({
        schemaVersion: projectJsonSchemaVersion,
        project: {
          profile: {
            length: -1,
            slenderness: 0,
            cylindricalInsertLength: 20,
            stations: 200,
            showGrid: true,
            showPoints: false,
          },
          equipment: [
            {
              id: "bad-equipment",
              name: "",
              shape: "unknown",
              massKg: -5,
              position: { x: "bad", y: 1, z: 2 },
              orientation: "bad-axis",
              dimensions: { radius: -1 },
            },
          ],
          scene3dSettings: { mode: "bad", hullOpacity: 99, section: { type: "crossSectionX", x: 999 } },
          balanceSettings: { waterDensityKgPerM3: -10, gravityMPerS2: "bad" },
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.warnings.length).toBeGreaterThan(0);
    expect(parsed.project.profile.length).toBe(0.1);
    expect(parsed.project.profile.slenderness).toBe(0.1);
    expect(parsed.project.profile.diameter).toBe(1);
    expect(parsed.project.profile.cylindricalInsertLength).toBe(0.05);
    expect(parsed.project.profile.stations).toBe(80);
    expect(parsed.project.equipment[0].shape).toBe("sphere");
    expect(parsed.project.equipment[0].massKg).toBeGreaterThan(0);
    expect(parsed.project.equipment[0].orientation).toBe("x");
    expect(parsed.project.scene3dSettings.mode).toBe("solid");
    expect(parsed.project.balanceSettings.waterDensityKgPerM3).toBeGreaterThan(0);
  });

  it("rejects unsupported schema versions and invalid json", () => {
    expect(parseProjectJson("not json").ok).toBe(false);
    expect(parseProjectJson(JSON.stringify({ schemaVersion: 999, project: {} })).ok).toBe(false);
    expect(parseProjectJson(JSON.stringify({ schemaVersion: projectJsonSchemaVersion })).ok).toBe(false);
  });
});
