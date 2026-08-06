import { describe, expect, it } from "vitest";
import type { ProjectEvaluation, ProjectInputs } from "../../application/project/model";
import type { EquipmentBalanceResult } from "../balance/model";
import { makeWorkbenchSummaryViewModel, renderWorkbenchSummary } from "./workbenchSummary";

function element(): HTMLElement {
  const classes = new Set<string>();
  const attributes = new Map<string, string>();
  return {
    textContent: "",
    classList: {
      add(...tokens: string[]) {
        for (const token of tokens) classes.add(token);
      },
      remove(...tokens: string[]) {
        for (const token of tokens) classes.delete(token);
      },
      contains(token: string) {
        return classes.has(token);
      },
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
  } as unknown as HTMLElement;
}

const inputs: ProjectInputs = Object.freeze({
  profile: Object.freeze({
    geometryMode: "legacy-dsnp-pa",
    length: 8,
    breadth: 3,
    height: 2,
    cylindricalInsertLength: 1,
    stations: 24,
  }),
  equipment: Object.freeze([
    Object.freeze({
      id: "equipment-1",
      name: "Battery",
      shape: "box",
      massKg: 10,
      position: Object.freeze({ x: 0, y: 0, z: 0 }),
      dimensions: Object.freeze({ lengthX: 1, breadthY: 1, heightZ: 1 }),
      orientation: "x",
    }),
  ]),
  balanceSettings: Object.freeze({ waterDensityKgPerM3: 1025, gravityMPerS2: 9.80665 }),
});

const balance: EquipmentBalanceResult = Object.freeze({
  buoyancyModel: "equipmentDisplacedVolume",
  isValid: true,
  totalMassKg: 40,
  displacedVolumeM3: 0.1,
  weightN: 392.266,
  buoyancyForceN: 1005.181625,
  netBuoyancyN: 612.915625,
  centerOfGravity: Object.freeze({ x: 4, y: 1.5, z: 2 }),
  centerOfBuoyancy: Object.freeze({ x: 4.2, y: 1.6, z: 2.2 }),
  momentArm: Object.freeze({ x: 0.2, y: 0.1, z: 0.2 }),
  deltaX: 0.2,
  deltaY: 0.1,
  bgM: -0.2,
  isVerticallyStable: false,
  alignmentToleranceM: 0.001,
  momentNm: Object.freeze({ x: -100, y: 200, z: 0 }),
  restoringMomentNm: Object.freeze({ x: 0, y: 0, z: 0 }),
  warnings: Object.freeze([]),
});

function makeEvaluation(overrides: Partial<ProjectEvaluation> = {}): ProjectEvaluation {
  return {
    hullGeometry: {
      state: {
        geometryMode: "legacy-dsnp-pa",
        length: 8,
        breadth: 3,
        height: 2,
        cylindricalInsertLength: 1,
        stations: 24,
      },
    },
    theoreticalDrawing: {},
    constraints: {
      issues: Object.freeze([]),
      statusById: Object.freeze(new Map([["equipment-1", "ok"]])),
    },
    balance,
    ...overrides,
  } as unknown as ProjectEvaluation;
}

function makeElements() {
  return {
    dimensions: element(),
    geometryMode: element(),
    stations: element(),
    equipmentCount: element(),
    constraints: element(),
    balance: element(),
  };
}

describe("workbench summary ui", () => {
  it("builds a compact summary from project inputs and evaluation results", () => {
    const viewModel = makeWorkbenchSummaryViewModel(inputs, makeEvaluation());

    expect(viewModel.dimensionsText).toBe("L 8,00 м; B 3,00 м; H 2,00 м");
    expect(viewModel.geometryModeText).toBe("Классическая методика");
    expect(viewModel.stationsText).toBe("24");
    expect(viewModel.equipmentCountText).toBe("1");
    expect(viewModel.constraintsText).toBe("Норма");
    expect(viewModel.constraintsStatus).toBe("normal");
    expect(viewModel.balanceText).toBe("Experimental: equipment-only");
    expect(viewModel.balanceStatus).toBe("experimental");
  });

  it("summarizes constraint and balance warnings with semantic statuses", () => {
    const elements = makeElements();
    const evaluation = makeEvaluation({
      constraints: {
        issues: Object.freeze([{ equipmentId: "equipment-1", reason: "outsideHull", message: "Outside" }]),
        statusById: Object.freeze(new Map([["equipment-1", "outsideHull"]])),
      },
      balance: {
        ...balance,
        warnings: Object.freeze([{ code: "nonPositiveBuoyancy", message: "Net buoyancy is zero or negative." }]),
      },
    } as unknown as Partial<ProjectEvaluation>);

    renderWorkbenchSummary(elements, inputs, evaluation);

    expect(elements.constraints.textContent).toBe("Ошибка: 1");
    expect(elements.constraints.classList.contains("ui-status--error")).toBe(true);
    expect(elements.constraints.getAttribute("data-ui-status")).toBe("error");
    expect(elements.balance.textContent).toBe("Experimental: предупреждений 1");
    expect(elements.balance.classList.contains("ui-status--warning")).toBe(true);
    expect(elements.balance.getAttribute("data-ui-status")).toBe("warning");
  });
});
