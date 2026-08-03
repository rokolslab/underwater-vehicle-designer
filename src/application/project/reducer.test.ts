import { describe, expect, it } from "vitest";
import type { EquipmentItem } from "../../modules/equipment/model";
import { createDefaultEquipmentItem } from "../../modules/equipment/placement";
import { createDefaultProjectInputs } from "./defaults";
import type { ProjectInputs } from "./model";
import { cloneProjectInputs } from "./ownership";
import { reduceProject } from "./reducer";

function makeState(equipment: readonly EquipmentItem[] = []): ProjectInputs {
  return cloneProjectInputs({
    ...createDefaultProjectInputs(),
    equipment,
    balanceSettings: Object.freeze({ waterDensityKgPerM3: 1000, gravityMPerS2: 9.81 }),
  });
}

function expectFrozenProject(project: ProjectInputs): void {
  expect(Object.isFrozen(project)).toBe(true);
  expect(Object.isFrozen(project.profile)).toBe(true);
  expect(Object.isFrozen(project.equipment)).toBe(true);
  expect(Object.isFrozen(project.balanceSettings)).toBe(true);
  for (const item of project.equipment) {
    expect(Object.isFrozen(item)).toBe(true);
    expect(Object.isFrozen(item.position)).toBe(true);
    expect(Object.isFrozen(item.dimensions)).toBe(true);
  }
}

describe("reduceProject", () => {
  it("replaces profile with owned frozen copy and preserves other slices", () => {
    const state = makeState();
    const profile = { ...state.profile, length: 7 };

    const next = reduceProject(state, { type: "ReplaceProfile", profile });
    profile.length = 9;

    expect(next).not.toBe(state);
    expect(next.profile).not.toBe(profile);
    expect(next.profile.length).toBe(7);
    expect(next.equipment).toBe(state.equipment);
    expect(next.balanceSettings).toBe(state.balanceSettings);
    expectFrozenProject(next);
  });

  it("returns the same root for reference-identical replacements and same-slice project shells", () => {
    const state = makeState();

    expect(reduceProject(state, { type: "ReplaceProfile", profile: state.profile })).toBe(state);
    expect(reduceProject(state, { type: "ReplaceBalanceSettings", balanceSettings: state.balanceSettings })).toBe(state);
    expect(reduceProject(state, { type: "ReplaceProject", project: state })).toBe(state);
    expect(
      reduceProject(state, {
        type: "ReplaceProject",
        project: { profile: state.profile, equipment: state.equipment, balanceSettings: state.balanceSettings },
      }),
    ).toBe(state);
  });

  it("replaces mixed project slices without cloning unchanged references", () => {
    const state = makeState();
    const profile = { ...state.profile, height: 3 };
    const balanceSettings = { waterDensityKgPerM3: 1025, gravityMPerS2: 9.7 };

    const next = reduceProject(state, {
      type: "ReplaceProject",
      project: { profile, equipment: state.equipment, balanceSettings },
    });
    profile.height = 4;
    balanceSettings.gravityMPerS2 = 1;

    expect(next.profile.height).toBe(3);
    expect(next.equipment).toBe(state.equipment);
    expect(next.balanceSettings.gravityMPerS2).toBe(9.7);
    expectFrozenProject(next);
  });

  it("adds equipment with deterministic default, requested, and colliding IDs", () => {
    const state = makeState([
      createDefaultEquipmentItem({ idFactory: () => "payload" }),
      createDefaultEquipmentItem({ idFactory: () => "payload-3" }),
    ]);

    const defaultAdded = reduceProject(makeState(), { type: "AddEquipment" });
    const requested = reduceProject(state, { type: "AddEquipment", requestedId: "sensor", shape: "box", name: "Sensor" });
    const colliding = reduceProject(state, { type: "AddEquipment", requestedId: "payload" });

    expect(defaultAdded.equipment.map((item) => item.id)).toEqual(["equipment-1"]);
    expect(requested.equipment.map((item) => item.id)).toEqual(["payload", "payload-3", "sensor"]);
    expect(requested.equipment[2]).toMatchObject({ shape: "box", name: "Sensor" });
    expect(colliding.equipment.map((item) => item.id)).toEqual(["payload", "payload-3", "payload-4"]);
    expect(requested.profile).toBe(state.profile);
    expect(requested.balanceSettings).toBe(state.balanceSettings);
  });

  it("updates equipment by stable ID and commits an empty patch for existing IDs", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "a" });
    const state = makeState([item]);

    const updated = reduceProject(state, {
      type: "UpdateEquipment",
      id: "a",
      update: { massKg: 12, displacedVolume: undefined },
    });
    const emptyPatch = reduceProject(state, { type: "UpdateEquipment", id: "a", update: {} });

    expect(updated.equipment[0]).not.toBe(item);
    expect(updated.equipment[0]).toMatchObject({ massKg: 12 });
    expect("displacedVolume" in updated.equipment[0]).toBe(false);
    expect(emptyPatch).not.toBe(state);
    expect(emptyPatch.equipment[0]).not.toBe(item);
    expect(updated.balanceSettings.gravityMPerS2).toBe(9.81);
  });

  it("preserves displacedVolume when update omits or sets it to undefined", () => {
    const [item] = reduceProject(makeState(), { type: "AddEquipment" }).equipment;
    const withDisplacement = reduceProject(makeState([item]), {
      type: "UpdateEquipment",
      id: item.id,
      update: { displacedVolume: 2 },
    });

    const omitted = reduceProject(withDisplacement, { type: "UpdateEquipment", id: item.id, update: { massKg: 3 } });
    const explicitUndefined = reduceProject(withDisplacement, {
      type: "UpdateEquipment",
      id: item.id,
      update: { displacedVolume: undefined },
    });

    expect(omitted.equipment[0].displacedVolume).toBe(2);
    expect(explicitUndefined.equipment[0].displacedVolume).toBe(2);
  });

  it("returns the same root for unknown equipment IDs", () => {
    const state = makeState([createDefaultEquipmentItem({ idFactory: () => "a" })]);

    expect(reduceProject(state, { type: "UpdateEquipment", id: "missing", update: { name: "Nope" } })).toBe(state);
    expect(reduceProject(state, { type: "DeleteEquipment", id: "missing" })).toBe(state);
  });

  it("deletes equipment and preserves unrelated slices", () => {
    const state = makeState([
      createDefaultEquipmentItem({ idFactory: () => "a" }),
      createDefaultEquipmentItem({ idFactory: () => "b" }),
    ]);

    const next = reduceProject(state, { type: "DeleteEquipment", id: "a" });

    expect(next.equipment.map((item) => item.id)).toEqual(["b"]);
    expect(next.equipment[0]).toBe(state.equipment[1]);
    expect(next.profile).toBe(state.profile);
    expect(next.balanceSettings).toBe(state.balanceSettings);
  });

  it("replaces balance settings with owned copy without losing it on unrelated commands", () => {
    const state = makeState();
    const balanceSettings = { waterDensityKgPerM3: 1010, gravityMPerS2: 9.5 };

    const balanced = reduceProject(state, { type: "ReplaceBalanceSettings", balanceSettings });
    balanceSettings.gravityMPerS2 = 1;
    const withEquipment = reduceProject(balanced, { type: "AddEquipment" });

    expect(balanced.balanceSettings.gravityMPerS2).toBe(9.5);
    expect(withEquipment.balanceSettings).toBe(balanced.balanceSettings);
    expect(withEquipment.balanceSettings.gravityMPerS2).toBe(9.5);
  });

  it("uses new-shape defaults when dimensions are omitted during shape change", () => {
    const [item] = reduceProject(makeState(), { type: "AddEquipment" }).equipment;

    const next = reduceProject(makeState([item]), {
      type: "UpdateEquipment",
      id: item.id,
      update: { shape: "cylinder" },
    });

    expect(next.equipment[0].shape).toBe("cylinder");
    if (next.equipment[0].shape !== "cylinder") throw new Error("expected cylinder");
    expect(next.equipment[0].dimensions).toEqual({ radius: 0.2, length: 0.5 });
  });
});
