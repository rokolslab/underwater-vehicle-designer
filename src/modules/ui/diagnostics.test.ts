import { describe, it, expect } from "vitest";
import { makeDiagnosticsViewModel } from "./diagnostics";
import type { EquipmentConstraintReport, EquipmentConstraintIssue, EquipmentConstraintStatus } from "../equipment/constraints";
import type { EquipmentBalanceResult, BalanceWarningCode } from "../balance/model";

function constraintReport(issues: EquipmentConstraintIssue[]): EquipmentConstraintReport {
  const mutableIssues: EquipmentConstraintIssue[] = [...issues];
  const issuesById = new Map<string, readonly EquipmentConstraintIssue[]>();
  const statusById = new Map<string, EquipmentConstraintStatus>();
  for (const issue of mutableIssues) {
    const existing = issuesById.get(issue.equipmentId) ?? [];
    issuesById.set(issue.equipmentId, [...existing, issue]);
    statusById.set(issue.equipmentId, issue.status);
  }
  return Object.freeze({
    issues: Object.freeze([...mutableIssues]),
    issuesById: issuesById as ReadonlyMap<string, readonly EquipmentConstraintIssue[]>,
    statusById: statusById as ReadonlyMap<string, EquipmentConstraintStatus>,
  }) as unknown as EquipmentConstraintReport;
}

function balanceResult(warnings: { code: BalanceWarningCode; message: string; equipmentId?: string }[]): EquipmentBalanceResult {
  return {
    buoyancyModel: "equipmentDisplacedVolume",
    isValid: true,
    totalMassKg: 0,
    displacedVolumeM3: 0,
    weightN: 0,
    buoyancyForceN: 0,
    netBuoyancyN: 0,
    centerOfGravity: { x: 0, y: 0, z: 0 },
    centerOfBuoyancy: { x: 0, y: 0, z: 0 },
    momentArm: { x: 0, y: 0, z: 0 },
    deltaX: 0,
    deltaY: 0,
    bgM: 0,
    isVerticallyStable: true,
    alignmentToleranceM: 0.1,
    momentNm: { x: 0, y: 0, z: 0 },
    restoringMomentNm: { x: 0, y: 0, z: 0 },
    warnings,
  } as unknown as EquipmentBalanceResult;
}

function makeItem(id: string) {
  return {
    id,
    name: `Item ${id}`,
    shape: "sphere" as const,
    massKg: 10,
    position: { x: 0, y: 0, z: 0 },
    orientation: "x" as const,
    dimensions: { radius: 0.1 },
  };
}

describe("makeDiagnosticsViewModel", () => {
  it("returns empty state for no equipment", () => {
    const vm = makeDiagnosticsViewModel([]);
    expect(vm.isEmpty).toBe(true);
    expect(vm.emptyReason).toBe("Добавьте оборудование, чтобы увидеть диагностику компоновки");
  });

  it("returns entries from constraint issues", () => {
    const items = [makeItem("eq-1")];
    const report = constraintReport([{
      equipmentId: "eq-1",
      reason: "outsideHull",
      message: "Outside hull",
      status: "outsideHull",
    }]);
    const vm = makeDiagnosticsViewModel(items, report);
    expect(vm.isEmpty).toBe(false);
    expect(vm.entries.length).toBeGreaterThanOrEqual(1);
    expect(vm.entries[0].source).toBe("constraint");
    expect(vm.entries[0].targetKind).toBe("equipment");
  });

  it("returns entries from balance warnings", () => {
    const items = [makeItem("eq-1")];
    const balance = balanceResult([{
      code: "emptyEquipment",
      message: "Нет оборудования",
    }]);
    const vm = makeDiagnosticsViewModel(items, undefined, balance);
    expect(vm.entries.length).toBeGreaterThanOrEqual(1);
    expect(vm.entries[0].source).toBe("balance");
  });

  it("dedupes invalidEquipment between constraint and balance", () => {
    const items = [makeItem("eq-1")];
    const report = constraintReport([{
      equipmentId: "eq-1",
      reason: "invalidEquipment",
      message: "Invalid data",
      status: "invalidEquipment",
    }]);
    const balance = balanceResult([{
      code: "invalidEquipment" as BalanceWarningCode,
      message: "Invalid equipment",
      equipmentId: "eq-1",
    }]);
    const vm = makeDiagnosticsViewModel(items, report, balance);
    const balanceInvalid = vm.entries.filter((e) => e.source === "balance" && e.id.includes("invalidEquipment"));
    expect(balanceInvalid.length).toBe(0);
  });

  it("skips equipmentOnlyBuoyancyModel warnings", () => {
    const items = [makeItem("eq-1")];
    const balance = balanceResult([{
      code: "equipmentOnlyBuoyancyModel" as BalanceWarningCode,
      message: "Equipment-only model",
    }]);
    const vm = makeDiagnosticsViewModel(items, undefined, balance);
    const modelWarnings = vm.entries.filter((e) => e.id.includes("equipmentOnlyBuoyancyModel"));
    expect(modelWarnings.length).toBe(0);
  });

  it("orders by severity then source then equipment index", () => {
    const items = [makeItem("eq-1"), makeItem("eq-2")];
    const report = constraintReport([
      { equipmentId: "eq-1", reason: "outsideHull", message: "Outside", status: "outsideHull" },
      { equipmentId: "eq-2", reason: "invalidEquipment", message: "Invalid", status: "invalidEquipment" },
    ]);
    const vm = makeDiagnosticsViewModel(items, report);
    expect(vm.entries[0].severity).toBe("error");
    expect(vm.entries[0].id).toContain("invalidEquipment");
  });

  it("returns empty but not null emptyReason when no issues", () => {
    const items = [makeItem("eq-1")];
    const vm = makeDiagnosticsViewModel(items);
    expect(vm.isEmpty).toBe(true);
    expect(vm.emptyReason).toBeNull();
  });

  it("marks equipment-targeted balance warnings with equipmentId", () => {
    const items = [makeItem("eq-1")];
    const balance = balanceResult([{
      code: "invalidEquipment" as BalanceWarningCode,
      message: "Invalid",
      equipmentId: "eq-1",
    }]);
    const vm = makeDiagnosticsViewModel(items, undefined, balance);
    expect(vm.entries.length).toBeGreaterThanOrEqual(1);
    expect(vm.entries[0].equipmentId).toBe("eq-1");
    expect(vm.entries[0].targetKind).toBe("equipment");
  });
});
