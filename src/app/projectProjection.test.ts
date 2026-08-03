import { describe, expect, it, vi } from "vitest";
import { createDefaultProjectInputs } from "../application/project/defaults";
import { projectProfileInputsWithViewToProfileState } from "../application/project/normalize";
import { inputsAndViewToSerializableProject, serializableProjectToInputsAndView, type ProjectViewState } from "./projectProjection";
import type { SerializableProjectState } from "../modules/persistence/project-json";

const view: ProjectViewState = Object.freeze({
  showGrid: false,
  showPoints: true,
  scene3dSettings: Object.freeze({
    mode: "cutaway",
    hullOpacity: 0.33,
    section: Object.freeze({ type: "crossSectionX", x: 1.25 }),
  }),
});

function makeSerializableProject(): SerializableProjectState {
  return Object.freeze({
    profile: Object.freeze({
      geometryMode: "legacy-dsnp-pa",
      length: 7.123456,
      breadth: 2.345678,
      height: 1.234567,
      slenderness: 99,
      diameter: 99,
      cylindricalInsertLength: 0.456789,
      stations: 17,
      showGrid: false,
      showPoints: true,
    }),
    equipment: Object.freeze([
      Object.freeze({
        id: "camera",
        name: "Camera",
        shape: "sphere" as const,
        massKg: 1.234567,
        position: Object.freeze({ x: 0.111111, y: 0.222222, z: 0.333333 }),
        orientation: "z" as const,
        dimensions: Object.freeze({ radius: 0.123456 }),
      }),
    ]),
    scene3dSettings: view.scene3dSettings,
    balanceSettings: Object.freeze({ waterDensityKgPerM3: 1000.123456, gravityMPerS2: 9.812345 }),
  });
}

describe("project persistence projections", () => {
  it("splits persisted project into canonical inputs and view state", () => {
    const result = serializableProjectToInputsAndView(makeSerializableProject());

    expect(result.inputs.profile).toEqual({
      geometryMode: "legacy-dsnp-pa",
      length: 7.123456,
      breadth: 2.345678,
      height: 1.234567,
      cylindricalInsertLength: 0.456789,
      stations: 17,
    });
    expect(result.inputs.profile).not.toHaveProperty("slenderness");
    expect(result.inputs.profile).not.toHaveProperty("diameter");
    expect(result.inputs.profile).not.toHaveProperty("showGrid");
    expect(result.inputs.profile).not.toHaveProperty("showPoints");
    expect(result.view).toEqual(view);
    expect(result.inputs.balanceSettings.gravityMPerS2).toBe(9.812345);
    expect(result.inputs.equipment[0].position.x).toBe(0.111111);
  });

  it("builds a fresh serializable project from canonical inputs and view state", () => {
    const inputs = createDefaultProjectInputs();
    const project = inputsAndViewToSerializableProject({
      ...inputs,
      profile: { ...inputs.profile, length: 9, height: 3, breadth: 2.5 },
      balanceSettings: { waterDensityKgPerM3: 998.7654321, gravityMPerS2: 9.8123456 },
    }, view);

    expect(project.profile).toEqual({
      geometryMode: "current-formula",
      length: 9,
      breadth: 2.5,
      height: 3,
      slenderness: 3,
      diameter: 3,
      cylindricalInsertLength: 0,
      stations: 20,
      showGrid: false,
      showPoints: true,
    });
    expect(project.scene3dSettings).toBe(view.scene3dSettings);
    expect(project.balanceSettings.gravityMPerS2).toBe(9.8123456);
    expect(project.balanceSettings.waterDensityKgPerM3).toBe(998.7654321);
  });

  it("projects canonical profile inputs to ProfileState without a normalization result", () => {
    const profile = projectProfileInputsWithViewToProfileState(
      { geometryMode: "current-formula", length: 12.5, breadth: 3, height: 2.5, cylindricalInsertLength: 1, stations: 21 },
      { showGrid: true, showPoints: false },
    );

    expect(profile.slenderness).toBe(5);
    expect(profile.diameter).toBe(2.5);
    expect(profile.showGrid).toBe(true);
    expect(profile.showPoints).toBe(false);
  });

  it("does not log from pure projections", () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    try {
      const projected = serializableProjectToInputsAndView(makeSerializableProject());
      inputsAndViewToSerializableProject(projected.inputs, projected.view);

      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleDebug).not.toHaveBeenCalled();
    } finally {
      consoleWarn.mockRestore();
      consoleDebug.mockRestore();
    }
  });
});
