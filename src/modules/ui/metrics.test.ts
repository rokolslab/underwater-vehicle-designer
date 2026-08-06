import { describe, expect, it } from "vitest";
import type { EquipmentBalanceResult } from "../balance/model";
import { renderBalanceMetrics } from "./metrics";

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
      toggle(token: string, force?: boolean) {
        const shouldAdd = force ?? !classes.has(token);
        if (shouldAdd) classes.add(token);
        else classes.delete(token);
        return shouldAdd;
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

function makeElements() {
  return {
    totalMass: element(),
    displacedVolume: element(),
    weight: element(),
    buoyancyForce: element(),
    netBuoyancy: element(),
    centerOfGravity: element(),
    centerOfBuoyancy: element(),
    momentArm: element(),
    deltaX: element(),
    deltaY: element(),
    bg: element(),
    warnings: element(),
  };
}

const result: EquipmentBalanceResult = Object.freeze({
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

describe("balance metrics ui", () => {
  it("renders numeric balance metrics", () => {
    const elements = makeElements();

    renderBalanceMetrics(elements, result);

    expect(elements.totalMass.textContent).toBe("40,000");
    expect(elements.displacedVolume.textContent).toBe("0,1000");
    expect(elements.weight.textContent).toBe("392,3");
    expect(elements.buoyancyForce.textContent).toBe("1 005,2");
    expect(elements.netBuoyancy.textContent).toBe("612,9");
    expect(elements.centerOfGravity.textContent).toContain("X 4,000 м");
    expect(elements.centerOfBuoyancy.textContent).toContain("Z 2,200 м");
    expect(elements.momentArm.textContent).toContain("X 0,200 м");
    expect(elements.deltaX.textContent).toBe("0,200 м");
    expect(elements.deltaY.textContent).toBe("0,100 м");
    expect(elements.bg.textContent).toBe("-0,200 м");
    expect(elements.warnings.textContent).toBe("Норма");
    expect(elements.warnings.classList.contains("ui-status--normal")).toBe(true);
    expect(elements.warnings.getAttribute("data-ui-status")).toBe("normal");
  });

  it("renders balance warnings", () => {
    const elements = makeElements();

    renderBalanceMetrics(elements, {
      ...result,
      warnings: Object.freeze([
        Object.freeze({ code: "nonPositiveBuoyancy", message: "Net buoyancy is zero or negative." }),
      ]),
    });

    expect(elements.warnings.textContent).toContain("Плавучесть");
    expect(elements.warnings.classList.contains("ui-status--warning")).toBe(true);
    expect(elements.warnings.getAttribute("data-ui-status")).toBe("warning");
  });
});
