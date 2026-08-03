import { describe, expect, it, vi } from "vitest";
import { createDefaultProjectInputs } from "./defaults";
import { deriveProject } from "./derive";
import type { ProjectInputs } from "./model";
import type { EquipmentItem } from "../../modules/equipment/model";

function sphere(overrides: Partial<EquipmentItem> = {}): EquipmentItem {
  return Object.freeze({
    id: "sphere-1",
    name: "Sphere",
    shape: "sphere",
    massKg: 10,
    position: Object.freeze({ x: 0, y: 0, z: 0 }),
    orientation: "x",
    dimensions: Object.freeze({ radius: 0.2 }),
    displacedVolume: 0.04,
    ...overrides,
  } as EquipmentItem);
}

function box(overrides: Partial<EquipmentItem> = {}): EquipmentItem {
  return Object.freeze({
    id: "box-1",
    name: "Box",
    shape: "box",
    massKg: 4,
    position: Object.freeze({ x: 0.1, y: 0, z: 0 }),
    orientation: "z",
    dimensions: Object.freeze({ lengthX: 0.4, breadthY: 0.4, heightZ: 0.4 }),
    displacedVolume: 0.02,
    ...overrides,
  } as EquipmentItem);
}

function project(overrides: Partial<ProjectInputs> = {}): ProjectInputs {
  const defaults = createDefaultProjectInputs();
  return Object.freeze({
    ...defaults,
    ...overrides,
    profile: Object.freeze({ ...defaults.profile, ...overrides.profile }),
    equipment: Object.freeze(overrides.equipment ?? defaults.equipment),
    balanceSettings: Object.freeze({ ...defaults.balanceSettings, ...overrides.balanceSettings }),
  });
}

describe("deriveProject", () => {
  it("derives a coherent immutable current-formula evaluation", () => {
    const evaluation = deriveProject(project({ equipment: [sphere()] }));

    expect(evaluation.hullGeometry.state.geometryMode).toBe("current-formula");
    expect(evaluation.theoreticalDrawing.totalLength).toBe(evaluation.hullGeometry.extents.totalLength);
    expect(evaluation.constraints.statusById.get("sphere-1")).toBe("ok");
    expect(evaluation.balance.buoyancyModel).toBe("equipmentDisplacedVolume");
    expect(evaluation.balance.warnings.some((warning) => warning.code === "equipmentOnlyBuoyancyModel")).toBe(true);
    expect(Object.isFrozen(evaluation)).toBe(true);
  });

  it("supports legacy mode, independent breadth/height, and cylindrical insert", () => {
    const evaluation = deriveProject(project({
      profile: {
        geometryMode: "legacy-dsnp-pa",
        length: 10,
        breadth: 4,
        height: 2,
        cylindricalInsertLength: 2,
        stations: 10,
      },
    }));

    expect(evaluation.hullGeometry.state.geometryMode).toBe("legacy-dsnp-pa");
    expect(evaluation.hullGeometry.extents.maxHalfBreadthY).toBeGreaterThan(2);
    expect(evaluation.hullGeometry.extents.maxHalfBreadthY).toBeCloseTo(2, 3);
    expect(evaluation.hullGeometry.extents.maxHalfHeightZ).toBeGreaterThan(1);
    expect(evaluation.hullGeometry.extents.maxHalfHeightZ).toBeCloseTo(1, 3);
    expect(evaluation.hullGeometry.extents.totalLength).toBe(10);
  });

  it("derives outside, intersection, and invalid equipment constraints", () => {
    const invalid = sphere({ id: "invalid", massKg: 0 });
    const evaluation = deriveProject(project({
      equipment: [
        sphere({ id: "outside", position: { x: 1, y: 1.2, z: 0 }, dimensions: { radius: 0.3 } }),
        sphere({ id: "other", position: { x: 1.2, y: 1.2, z: 0 }, dimensions: { radius: 0.3 } }),
        invalid,
      ],
    }));

    expect(evaluation.constraints.statusById.get("outside")).toBe("outsideHull");
    expect(evaluation.constraints.issues.some((issue) => issue.reason === "intersects")).toBe(true);
    expect(evaluation.constraints.statusById.get("invalid")).toBe("invalidEquipment");
    expect(evaluation.balance.warnings.some((warning) => warning.code === "invalidEquipment" && warning.equipmentId === "invalid")).toBe(true);
  });

  it("uses exact balance settings without replacing density or gravity", () => {
    const evaluation = deriveProject(project({
      equipment: [box()],
      balanceSettings: { waterDensityKgPerM3: 997, gravityMPerS2: 9.81 },
    }));

    expect(evaluation.balance.weightN).toBeCloseTo(4 * 9.81, 12);
    expect(evaluation.balance.buoyancyForceN).toBeCloseTo(0.02 * 997 * 9.81, 12);
  });

  it("returns deterministic repeated results without console side effects", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const inputs = project({ equipment: [sphere(), box()] });
      const first = deriveProject(inputs);
      const second = deriveProject(inputs);

      expect(second).toEqual(first);
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
