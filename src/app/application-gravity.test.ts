import { describe, expect, it } from "vitest";
import v2Fixture from "../../tests/fixtures/project-v2-sname-ned.json";
import { createDefaultProjectInputs } from "../application/project/defaults";
import { createProjectStore } from "../application/project/store";
import { DEFAULT_GRAVITY_M_PER_S2 } from "../modules/balance/equipment-balance";
import { buildProjectJson, parseProjectJson } from "../modules/persistence/project-json";
import { defaultScene3dSettings } from "../modules/rendering/viewSettings";
import { inputsAndViewToSerializableProject, serializableProjectToInputsAndView, type ProjectViewState } from "./projectProjection";

const defaultView: ProjectViewState = Object.freeze({
  showGrid: true,
  showPoints: true,
  scene3dSettings: defaultScene3dSettings,
});

describe("application gravity workflow", () => {
  it("preserves imported gravity through unrelated store updates and resets it with project reset", () => {
    const imported = parseProjectJson(JSON.stringify(v2Fixture));
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const projected = serializableProjectToInputsAndView(imported.project);
    const store = createProjectStore(createDefaultProjectInputs());
    store.dispatch({ type: "ReplaceProject", project: projected.inputs });

    store.dispatch({ type: "AddEquipment" });
    const roundTrip = parseProjectJson(buildProjectJson(inputsAndViewToSerializableProject(store.getSnapshot(), projected.view)));
    expect(roundTrip.ok).toBe(true);
    if (!roundTrip.ok) return;
    expect(roundTrip.warnings).toHaveLength(0);
    expect(roundTrip.project.balanceSettings.gravityMPerS2).toBe(9.81);

    store.dispatch({ type: "ReplaceProject", project: createDefaultProjectInputs() });
    const resetRoundTrip = parseProjectJson(buildProjectJson(inputsAndViewToSerializableProject(store.getSnapshot(), defaultView)));
    expect(resetRoundTrip.ok).toBe(true);
    if (!resetRoundTrip.ok) return;
    expect(resetRoundTrip.project.balanceSettings.gravityMPerS2).toBe(DEFAULT_GRAVITY_M_PER_S2);
  });
});
