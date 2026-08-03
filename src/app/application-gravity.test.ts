import { describe, expect, it } from "vitest";
import v2Fixture from "../../tests/fixtures/project-v2-sname-ned.json";
import { DEFAULT_GRAVITY_M_PER_S2 } from "../modules/balance/equipment-balance";
import type { ControlElements } from "../modules/ui/controls";
import { buildProjectJson, parseProjectJson, type SerializableProjectState } from "../modules/persistence/project-json";
import { createAppStateController } from "./appState";
import { makeProjectState } from "./projectState";

function input(value: string, checked = false): HTMLInputElement {
  return { value, checked } as HTMLInputElement;
}

function select(value: string): HTMLSelectElement {
  return { value } as HTMLSelectElement;
}

function makeControls(): ControlElements {
  return {
    length: input("6"),
    breadth: input("2"),
    height: input("2"),
    slenderness: input("3"),
    cylindricalInsertLength: input("0"),
    geometryMode: select("current-formula"),
    stations: input("20"),
    showGrid: input("", true),
    showPoints: input("", true),
  };
}

function writeProfileControls(controls: ControlElements, profile: SerializableProjectState["profile"]): void {
  controls.length.value = String(profile.length);
  controls.breadth.value = String(profile.breadth);
  controls.height.value = String(profile.height);
  controls.slenderness.value = String(profile.slenderness);
  controls.cylindricalInsertLength.value = String(profile.cylindricalInsertLength);
  controls.geometryMode.value = profile.geometryMode;
  controls.stations.value = String(profile.stations);
  controls.showGrid.checked = profile.showGrid;
  controls.showPoints.checked = profile.showPoints;
}

describe("application gravity workflow", () => {
  it("preserves imported gravity through unrelated updates and resets it with project reset", () => {
    const imported = parseProjectJson(JSON.stringify(v2Fixture));
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const controls = makeControls();
    const appState = createAppStateController(controls);
    writeProfileControls(controls, imported.project.profile);

    appState.applyImportedGravityMPerS2(imported.project.balanceSettings.gravityMPerS2);
    const firstProfile = appState.readState("height");
    makeProjectState(
      firstProfile,
      imported.project.equipment,
      imported.project.scene3dSettings,
      appState.makeCurrentBalanceSettings(imported.project.balanceSettings.waterDensityKgPerM3),
    );

    controls.stations.value = "21";
    const updatedProject = makeProjectState(
      appState.readState("height"),
      imported.project.equipment,
      imported.project.scene3dSettings,
      appState.makeCurrentBalanceSettings(imported.project.balanceSettings.waterDensityKgPerM3),
    );
    const roundTrip = parseProjectJson(buildProjectJson(updatedProject));
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    expect(roundTrip.warnings).toHaveLength(0);
    expect(roundTrip.project.balanceSettings.gravityMPerS2).toBe(9.81);

    const resetProfile = appState.reset();
    const resetProject = makeProjectState(
      resetProfile,
      [],
      imported.project.scene3dSettings,
      appState.makeCurrentBalanceSettings(imported.project.balanceSettings.waterDensityKgPerM3),
    );
    const resetRoundTrip = parseProjectJson(buildProjectJson(resetProject));
    expect(resetRoundTrip.ok).toBe(true);
    if (!resetRoundTrip.ok) return;
    expect(resetRoundTrip.project.balanceSettings.gravityMPerS2).toBe(DEFAULT_GRAVITY_M_PER_S2);
  });
});
