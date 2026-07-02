import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import type { ProfileSnapshot } from "../geometry/model";
import type { EquipmentAxis, EquipmentItem } from "./model";
import { equipmentIssues, equipmentStatus, evaluateEquipmentConstraints } from "./constraints";

function snapshot(overrides: Partial<ProfileSnapshot["state"]> = {}): ProfileSnapshot {
  return makeProfileSnapshot({
    length: 10,
    slenderness: 5,
    diameter: 2,
    cylindricalInsertLength: 0,
    stations: 10,
    showGrid: true,
    showPoints: true,
    ...overrides,
  });
}

function sphere(id: string, position: EquipmentItem["position"], radius = 0.15): EquipmentItem {
  return Object.freeze({
    id,
    name: id,
    shape: "sphere",
    massKg: 1,
    position: Object.freeze(position),
    orientation: "x",
    dimensions: Object.freeze({ radius }),
  });
}

function cylinder(id: string, position: EquipmentItem["position"], orientation: EquipmentAxis = "x"): EquipmentItem {
  return Object.freeze({
    id,
    name: id,
    shape: "cylinder",
    massKg: 1,
    position: Object.freeze(position),
    orientation,
    dimensions: Object.freeze({ radius: 0.12, length: 0.8 }),
  });
}

function box(id: string, position: EquipmentItem["position"], orientation: EquipmentAxis = "x"): EquipmentItem {
  return Object.freeze({
    id,
    name: id,
    shape: "box",
    massKg: 1,
    position: Object.freeze(position),
    orientation,
    dimensions: Object.freeze({ width: 0.4, height: 0.3, depth: 0.3 }),
  });
}

describe("equipment constraints", () => {
  it("returns ok status for a sphere fully inside the hull", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("s1", { x: 4, y: 0, z: 0 })]);

    expect(equipmentStatus(report, "s1")).toBe("ok");
    expect(equipmentIssues(report, "s1")).toHaveLength(0);
  });

  it("detects equipment outside the hull radius", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("s1", { x: 4, y: 1.2, z: 0 }, 0.2)]);

    expect(equipmentStatus(report, "s1")).toBe("outsideHull");
    expect(equipmentIssues(report, "s1").some((issue) => issue.reason === "outsideHull")).toBe(true);
  });

  it("detects equipment outside longitudinal bounds", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("s1", { x: -0.05, y: 0, z: 0 }, 0.2)]);

    expect(equipmentStatus(report, "s1")).toBe("outsideHull");
    expect(equipmentIssues(report, "s1").some((issue) => issue.reason === "outsideLength")).toBe(true);
  });

  it("checks x-oriented cylinders against hull containment", () => {
    const inside = evaluateEquipmentConstraints(snapshot(), [cylinder("c1", { x: 4, y: 0, z: 0 }, "x")]);
    const outside = evaluateEquipmentConstraints(snapshot(), [cylinder("c2", { x: 4, y: 1.2, z: 0 }, "x")]);

    expect(equipmentStatus(inside, "c1")).toBe("ok");
    expect(equipmentStatus(outside, "c2")).toBe("outsideHull");
  });

  it("uses conservative containment for transverse boxes and cylinders", () => {
    const transverseBox = box("b1", { x: 4, y: 1.1, z: 0 }, "y");
    const transverseCylinder = cylinder("c1", { x: 4, y: 1.1, z: 0 }, "z");
    const report = evaluateEquipmentConstraints(snapshot(), [transverseBox, transverseCylinder]);

    expect(equipmentStatus(report, "b1")).toBe("outsideHull");
    expect(equipmentStatus(report, "c1")).toBe("outsideHull");
  });

  it("detects sphere-sphere intersections and non-intersections", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("s1", { x: 4, y: 0, z: 0 }, 0.3),
      sphere("s2", { x: 4.5, y: 0, z: 0 }, 0.3),
      sphere("s3", { x: 6, y: 0, z: 0 }, 0.2),
    ]);

    expect(equipmentStatus(report, "s1")).toBe("intersects");
    expect(equipmentStatus(report, "s2")).toBe("intersects");
    expect(equipmentStatus(report, "s3")).toBe("ok");
  });

  it("does not duplicate pair issues for one intersection", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("s1", { x: 4, y: 0, z: 0 }, 0.3),
      sphere("s2", { x: 4.5, y: 0, z: 0 }, 0.3),
    ]);

    expect(report.issues.filter((issue) => issue.reason === "intersects")).toHaveLength(2);
    expect(equipmentIssues(report, "s1").filter((issue) => issue.otherEquipmentId === "s2")).toHaveLength(1);
    expect(equipmentIssues(report, "s2").filter((issue) => issue.otherEquipmentId === "s1")).toHaveLength(1);
  });

  it("keeps cylindrical insert containment consistent with profile radius", () => {
    const report = evaluateEquipmentConstraints(snapshot({ cylindricalInsertLength: 2 }), [
      sphere("s1", { x: 4.8, y: 0.68, z: 0 }, 0.08),
    ]);

    expect(equipmentStatus(report, "s1")).toBe("ok");
  });

  it("uses deterministic severity priority for display status", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("outside", { x: 4, y: 1.2, z: 0 }, 0.3),
      sphere("other", { x: 4.2, y: 1.2, z: 0 }, 0.3),
    ]);

    expect(equipmentStatus(report, "outside")).toBe("outsideHull");
    expect(equipmentIssues(report, "outside").some((issue) => issue.reason === "intersects")).toBe(true);
  });
});
