import { describe, it, expect } from "vitest";
import { makeInspectorViewModel } from "./equipmentInspector";
import type { EquipmentConstraintReport } from "../equipment/constraints";

function constraintReport(status: string): EquipmentConstraintReport {
  return {
    issues: [],
    issuesById: new Map(),
    statusById: new Map([["eq-1", status as EquipmentConstraintReport["statusById"] extends Map<infer _K, infer V> ? V : never]]),
  } as unknown as EquipmentConstraintReport;
}

function makeSphere(id: string) {
  return {
    id,
    name: `Сфера ${id}`,
    shape: "sphere" as const,
    massKg: 10,
    position: { x: 1, y: 2, z: 3 },
    orientation: "x" as const,
    dimensions: { radius: 0.5 },
  };
}

function makeCylinder(id: string) {
  return {
    id,
    name: `Цилиндр ${id}`,
    shape: "cylinder" as const,
    massKg: 20,
    position: { x: 0, y: 0, z: 0 },
    orientation: "z" as const,
    dimensions: { radius: 0.3, length: 2 },
  };
}

function makeBox(id: string) {
  return {
    id,
    name: `Блок ${id}`,
    shape: "box" as const,
    massKg: 30,
    position: { x: 0, y: 0, z: 0 },
    orientation: "x" as const,
    dimensions: { lengthX: 1, breadthY: 2, heightZ: 3 },
  };
}

describe("makeInspectorViewModel", () => {
  it("returns empty state when no selection", () => {
    const vm = makeInspectorViewModel([makeSphere("eq-1")], null);
    expect(vm.isEmpty).toBe(true);
  });

  it("returns empty state when selected item not found", () => {
    const vm = makeInspectorViewModel([makeSphere("eq-1")], "eq-999");
    expect(vm.isEmpty).toBe(true);
  });

  it("returns sphere details", () => {
    const vm = makeInspectorViewModel([makeSphere("eq-1")], "eq-1");
    expect(vm.isEmpty).toBe(false);
    expect(vm.name).toBe("Сфера eq-1");
    expect(vm.shape).toBe("Сфера");
    expect(vm.massKg).toBe(10);
    expect(vm.positionX).toBe(1);
    expect(vm.positionY).toBe(2);
    expect(vm.positionZ).toBe(3);
    expect(vm.dimensions).toHaveLength(1);
    expect(vm.dimensions![0]).toEqual({ label: "R, м", value: 0.5 });
  });

  it("returns cylinder details", () => {
    const vm = makeInspectorViewModel([makeCylinder("eq-2")], "eq-2");
    expect(vm.shape).toBe("Цилиндр");
    expect(vm.dimensions).toHaveLength(2);
  });

  it("returns box details", () => {
    const vm = makeInspectorViewModel([makeBox("eq-3")], "eq-3");
    expect(vm.shape).toBe("Блок");
    expect(vm.dimensions).toHaveLength(3);
    expect(vm.dimensions![0]).toEqual({ label: "Lx, м", value: 1 });
  });

  it("shows engineering status for selected item", () => {
    const items = [makeSphere("eq-1")];
    const report = constraintReport("outsideHull");
    const vm = makeInspectorViewModel(items, "eq-1", report);
    expect(vm.status).toBe("Вне корпуса");
    expect(vm.statusType).toBe("warning");
  });

  it("shows issues when present", () => {
    const items = [makeSphere("eq-1")];
    const report: EquipmentConstraintReport = {
      issues: [{ equipmentId: "eq-1", reason: "outsideHull", message: "Выход за корпус", status: "outsideHull" }],
      issuesById: new Map([["eq-1", [{ equipmentId: "eq-1", reason: "outsideHull", message: "Выход за корпус", status: "outsideHull" }]]]),
      statusById: new Map([["eq-1", "outsideHull" as const]]),
    };
    const vm = makeInspectorViewModel(items, "eq-1", report);
    expect(vm.issues).toBeDefined();
    expect(vm.issues!.length).toBeGreaterThan(0);
  });
});
