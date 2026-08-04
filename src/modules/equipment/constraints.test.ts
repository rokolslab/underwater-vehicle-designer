import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeProfileSnapshot } from "../geometry/profile";
import type { ProfileSnapshot } from "../geometry/model";
import { makeEllipseSectionShape, sectionShapeExtents } from "../geometry/section-shape";
import type { EquipmentAxis, EquipmentItem } from "./model";
import { equipmentIssues, equipmentStatus, evaluateEquipmentConstraints } from "./constraints";

function snapshot(overrides: Partial<ProfileSnapshot["state"]> = {}): ProfileSnapshot {
  return makeProfileSnapshot({
    length: 10,
    breadth: 2,
    height: 2,
    slenderness: 5,
    diameter: 2,
    cylindricalInsertLength: 0,
    stations: 10,
    ...overrides,
  });
}

function ellipticalSnapshot(): ProfileSnapshot {
  const state = Object.freeze({
    geometryMode: "legacy-dsnp-pa" as const,
    length: 10,
    breadth: 4,
    height: 2,
    slenderness: 2.5,
    diameter: 4,
    cylindricalInsertLength: 0,
    stations: 2,
  });
  const shape = makeEllipseSectionShape(2, 1);
  const smoothPoints = Object.freeze(
    [0, 5, 10].map((s) => Object.freeze({ s, shape, ...sectionShapeExtents(shape) })),
  );
  const stationPoints = Object.freeze(
    smoothPoints.map((point) => Object.freeze({ ...point, topRadius: point.halfHeightZ, bottomRadius: -point.halfHeightZ })),
  );

  return Object.freeze({
    state,
    smoothPoints,
    stationPoints,
    extents: Object.freeze({
      maxRadius: 1,
      maxHalfBreadthY: 2,
      maxHalfHeightZ: 1,
      maxHeight: 2,
      maxRadiusS: 0,
      totalLength: 10,
    }),
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

  it("checks legacy elliptical box corners instead of only the center offset", () => {
    const item: EquipmentItem = Object.freeze({
      id: "wide-box",
      name: "wide-box",
      shape: "box",
      massKg: 1,
      position: Object.freeze({ x: 0, y: 0, z: 0.8 }),
      orientation: "x",
      dimensions: Object.freeze({ lengthX: 0.2, breadthY: 1.8, heightZ: 0.2 }),
    });
    const report = evaluateEquipmentConstraints(ellipticalSnapshot(), [item]);

    expect(equipmentStatus(report, "wide-box")).toBe("outsideHull");
    expect(equipmentIssues(report, "wide-box").some((issue) => issue.reason === "outsideHull")).toBe(true);
  });

  it("checks legacy elliptical cylinder control points instead of only the center offset", () => {
    const item: EquipmentItem = Object.freeze({
      id: "wide-cylinder",
      name: "wide-cylinder",
      shape: "cylinder",
      massKg: 1,
      position: Object.freeze({ x: 0, y: 0, z: 0.94 }),
      orientation: "y",
      dimensions: Object.freeze({ radius: 0.12, length: 0.8 }),
    });
    const report = evaluateEquipmentConstraints(ellipticalSnapshot(), [item]);

    expect(equipmentStatus(report, "wide-cylinder")).toBe("outsideHull");
  });

  it("checks current-formula elliptical sections with the common containment path", () => {
    const report = evaluateEquipmentConstraints(snapshot({ breadth: 4, height: 2, diameter: 2 }), [
      sphere("inside-y", { x: 0, y: 1.4, z: 0 }, 0.15),
      sphere("outside-z", { x: 0, y: 0, z: 1.05 }, 0.05),
    ]);

    expect(equipmentStatus(report, "inside-y")).toBe("ok");
    expect(equipmentStatus(report, "outside-z")).toBe("outsideHull");
  });

  it("keeps containment shape-aware without adapter, logger or local ellipse math dependencies", () => {
    const source = readFileSync(join(process.cwd(), "src/modules/equipment/constraints.ts"), "utf8");

    expect(source).toContain("containsSectionPoint");
    expect(source).not.toContain("function ellipseValue");
    expect(source).not.toContain("../rendering");
    expect(source).not.toContain("../ui");
    expect(source).not.toContain("shared/logger");
    expect(source).not.toMatch(/\b(document|window|HTMLCanvasElement|HTMLElement)\b/u);
  });

  it("uses deterministic severity priority for display status", () => {
    const report = evaluateEquipmentConstraints(snapshot(), [
      sphere("outside", { x: 1, y: 1.2, z: 0 }, 0.3),
      sphere("other", { x: 1.2, y: 1.2, z: 0 }, 0.3),
    ]);

    expect(equipmentStatus(report, "outside")).toBe("outsideHull");
    expect(equipmentIssues(report, "outside").some((issue) => issue.reason === "intersects")).toBe(true);
  });

  it("does not write console output from pure constraint evaluation", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      evaluateEquipmentConstraints(snapshot(), [
        sphere("outside", { x: 1, y: 1.2, z: 0 }, 0.3),
        sphere("other", { x: 1.2, y: 1.2, z: 0 }, 0.3),
      ]);

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
