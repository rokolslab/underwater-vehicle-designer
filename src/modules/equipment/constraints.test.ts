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
    dimensions: Object.freeze({ lengthX: 0.4, breadthY: 0.3, heightZ: 0.3 }),
  });
}

describe("equipment constraints", () => {
  it.each([
    ["nose", { x: 4.9, y: 0, z: 0 }],
    ["stern", { x: -4.9, y: 0, z: 0 }],
    ["starboard", { x: 1, y: 1.2, z: 0 }],
    ["port", { x: 1, y: -1.2, z: 0 }],
    ["bottom", { x: 1, y: 0, z: 1.2 }],
    ["top", { x: 1, y: 0, z: -1.2 }],
  ] as const)("detects equipment outside toward %s", (_direction, position) => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("outside", position, 0.2)]);

    expect(equipmentStatus(report, "outside")).toBe("outsideHull");
  });

  it.each(["x", "y", "z"] as const)("checks a cylinder aligned with body %s", (orientation) => {
    const report = evaluateEquipmentConstraints(snapshot(), [cylinder(`cylinder-${orientation}`, { x: 1, y: 0, z: 0 }, orientation)]);

    expect(equipmentStatus(report, `cylinder-${orientation}`)).toBe("ok");
  });

  it("uses named body-axis dimensions for a non-cubic box", () => {
    const item: EquipmentItem = Object.freeze({
      id: "box",
      name: "box",
      shape: "box",
      massKg: 1,
      position: Object.freeze({ x: 1, y: 0, z: 0 }),
      orientation: "x",
      dimensions: Object.freeze({ lengthX: 1.2, breadthY: 0.4, heightZ: 0.6 }),
    });
    const report = evaluateEquipmentConstraints(snapshot(), [item]);

    expect(equipmentStatus(report, "box")).toBe("ok");
  });

  it("returns ok status for a sphere fully inside the hull", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("s1", { x: 1, y: 0, z: 0 })]);

    expect(equipmentStatus(report, "s1")).toBe("ok");
    expect(equipmentIssues(report, "s1")).toHaveLength(0);
  });

  it("detects equipment outside the hull radius", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("s1", { x: 1, y: 1.2, z: 0 }, 0.2)]);

    expect(equipmentStatus(report, "s1")).toBe("outsideHull");
    expect(equipmentIssues(report, "s1").some((issue) => issue.reason === "outsideHull")).toBe(true);
  });

  it("detects equipment outside longitudinal bounds", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [sphere("s1", { x: 4.9, y: 0, z: 0 }, 0.2)]);

    expect(equipmentStatus(report, "s1")).toBe("outsideHull");
    expect(equipmentIssues(report, "s1").some((issue) => issue.reason === "outsideLength")).toBe(true);
  });

  it("checks x-oriented cylinders against hull containment", () => {
    const inside = evaluateEquipmentConstraints(snapshot(), [cylinder("c1", { x: 1, y: 0, z: 0 }, "x")]);
    const outside = evaluateEquipmentConstraints(snapshot(), [cylinder("c2", { x: 1, y: 1.2, z: 0 }, "x")]);

    expect(equipmentStatus(inside, "c1")).toBe("ok");
    expect(equipmentStatus(outside, "c2")).toBe("outsideHull");
  });

  it("uses conservative containment for transverse boxes and cylinders", () => {
    const transverseBox = box("b1", { x: 1, y: 1.1, z: 0 }, "y");
    const transverseCylinder = cylinder("c1", { x: 1, y: 1.1, z: 0 }, "z");
    const report = evaluateEquipmentConstraints(snapshot(), [transverseBox, transverseCylinder]);

    expect(equipmentStatus(report, "b1")).toBe("outsideHull");
    expect(equipmentStatus(report, "c1")).toBe("outsideHull");
  });

  it("detects sphere-sphere intersections and non-intersections", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("s1", { x: 1, y: 0, z: 0 }, 0.3),
      sphere("s2", { x: 1.5, y: 0, z: 0 }, 0.3),
      sphere("s3", { x: 3, y: 0, z: 0 }, 0.2),
    ]);

    expect(equipmentStatus(report, "s1")).toBe("intersects");
    expect(equipmentStatus(report, "s2")).toBe("intersects");
    expect(equipmentStatus(report, "s3")).toBe("ok");
  });

  it("does not duplicate pair issues for one intersection", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("s1", { x: 1, y: 0, z: 0 }, 0.3),
      sphere("s2", { x: 1.5, y: 0, z: 0 }, 0.3),
    ]);

    expect(report.issues.filter((issue) => issue.reason === "intersects")).toHaveLength(2);
    expect(equipmentIssues(report, "s1").filter((issue) => issue.otherEquipmentId === "s2")).toHaveLength(1);
    expect(equipmentIssues(report, "s2").filter((issue) => issue.otherEquipmentId === "s1")).toHaveLength(1);
  });

  it("uses equipment names in intersection messages", () => {
    const first = { ...sphere("equipment-1", { x: 1, y: 0, z: 0 }, 0.3), name: "Шар 1" };
    const second = { ...sphere("equipment-2", { x: 1.5, y: 0, z: 0 }, 0.3), name: "Цилиндр 1" };
    const report = evaluateEquipmentConstraints(snapshot(), [first, second]);

    const firstMessage = equipmentIssues(report, "equipment-1").find((issue) => issue.reason === "intersects")?.message;
    const secondMessage = equipmentIssues(report, "equipment-2").find((issue) => issue.reason === "intersects")?.message;

    expect(firstMessage).toContain("Цилиндр 1");
    expect(firstMessage).not.toContain("equipment-2");
    expect(secondMessage).toContain("Шар 1");
    expect(secondMessage).not.toContain("equipment-1");
  });
  it("keeps cylindrical insert containment consistent with profile radius", () => {
    const report = evaluateEquipmentConstraints(snapshot({ cylindricalInsertLength: 2 }), [
      sphere("s1", { x: 0.2, y: 0.68, z: 0 }, 0.08),
    ]);

    expect(equipmentStatus(report, "s1")).toBe("ok");
  });

  it("uses deterministic severity priority for display status", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("outside", { x: 1, y: 1.2, z: 0 }, 0.3),
      sphere("other", { x: 1.2, y: 1.2, z: 0 }, 0.3),
    ]);

    expect(equipmentStatus(report, "outside")).toBe("outsideHull");
    expect(equipmentIssues(report, "outside").some((issue) => issue.reason === "intersects")).toBe(true);
  });
});
