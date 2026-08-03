import { describe, expect, it } from "vitest";
import { createDefaultProjectInputs } from "../application/project/defaults";
import { createProjectStore } from "../application/project/store";
import { buildProjectJson, projectJsonCoordinateSystem, projectJsonSchemaVersion } from "../modules/persistence/project-json";
import { inputsAndViewToSerializableProject, type ProjectViewState } from "./projectProjection";
import { prepareProjectImport } from "./projectImport";

const view: ProjectViewState = Object.freeze({
  showGrid: false,
  showPoints: true,
  scene3dSettings: Object.freeze({
    mode: "x-ray",
    hullOpacity: 0.31,
    section: Object.freeze({ type: "longitudinalPlane", plane: "xz", offset: 0.123456 }),
  }),
});

describe("prepareProjectImport", () => {
  it("prepares canonical inputs and view without requiring a store or DOM", () => {
    const defaults = createDefaultProjectInputs();
    const json = buildProjectJson(inputsAndViewToSerializableProject({
      ...defaults,
      profile: {
        geometryMode: "legacy-dsnp-pa",
        length: 8.123456,
        breadth: 2.234567,
        height: 1.345678,
        cylindricalInsertLength: 0.456789,
        stations: 23,
      },
      equipment: [
        {
          id: "battery",
          name: "Battery",
          shape: "box",
          massKg: 12.345678,
          position: { x: 1.111111, y: 2.222222, z: 3.333333 },
          orientation: "y",
          dimensions: { lengthX: 1.123456, breadthY: 0.234567, heightZ: 0.345678 },
          displacedVolume: 0.456789,
        },
      ],
      balanceSettings: { waterDensityKgPerM3: 1001.234567, gravityMPerS2: 9.812345 },
    }, view));

    const prepared = prepareProjectImport(json);

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.inputs.profile).toEqual({
      geometryMode: "legacy-dsnp-pa",
      length: 8.123456,
      breadth: 2.234567,
      height: 1.345678,
      cylindricalInsertLength: 0.456789,
      stations: 23,
    });
    expect(prepared.inputs.profile).not.toHaveProperty("slenderness");
    expect(prepared.inputs.profile).not.toHaveProperty("diameter");
    expect(prepared.view).toEqual(view);
    expect(prepared.inputs.balanceSettings.gravityMPerS2).toBe(9.812345);
    expect(prepared.inputs.equipment[0].position.z).toBe(3.333333);
    expect(prepared.warnings).toEqual([]);
  });

  it("returns existing parser errors without mutating application state", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const before = store.getSnapshot();
    const prepared = prepareProjectImport("{bad json");

    expect(prepared).toEqual({ ok: false, error: "Некорректный JSON-файл проекта.", warnings: [] });
    expect(store.getSnapshot()).toBe(before);
  });

  it("passes parser warnings and migration metadata through", () => {
    const v1Document = {
      schemaVersion: 1,
      exportedAt: "2026-08-03T00:00:00.000Z",
      project: {
        profile: { length: 8, diameter: 2, stations: 12, showGrid: true, showPoints: false },
        equipment: [
          {
            id: "dup",
            name: "One",
            shape: "sphere",
            massKg: 1,
            position: { x: 0, y: 0, z: 1 },
            orientation: "x",
            dimensions: { radius: 0.2 },
          },
        ],
        scene3dSettings: { mode: "solid", hullOpacity: 0.28, section: { type: "disabled" } },
        balanceSettings: { waterDensityKgPerM3: 1025, gravityMPerS2: 9.80665 },
      },
    };

    const prepared = prepareProjectImport(JSON.stringify(v1Document));

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.migratedFromVersion).toBe(1);
    expect(prepared.warnings).toContain(
      "Проект v1 преобразован в SNAME/NED: старая ось z принята направленной на правый борт (body +Y). Проверьте размещение по бортам.",
    );
  });

  it("normalizes unsafe fields as successful preparation with warnings", () => {
    const unsafe = {
      schemaVersion: projectJsonSchemaVersion,
      coordinateSystem: projectJsonCoordinateSystem,
      exportedAt: "2026-08-03T00:00:00.000Z",
      project: {
        profile: { length: -1, height: "bad", breadth: "bad", stations: 999, showGrid: false, showPoints: false },
        equipment: "bad",
        scene3dSettings: { mode: "bad" },
        balanceSettings: { waterDensityKgPerM3: -1, gravityMPerS2: "bad" },
      },
    };

    const prepared = prepareProjectImport(JSON.stringify(unsafe));

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.inputs.profile.length).toBe(0.1);
    expect(prepared.inputs.profile.stations).toBe(80);
    expect(prepared.inputs.equipment).toEqual([]);
    expect(prepared.warnings).toContain("project.profile.length normalized");
    expect(prepared.warnings).toContain("project.equipment is not an array; empty list used");
    expect(prepared.warnings).toContain("project.balanceSettings.gravityMPerS2 normalized");
  });
});
