import { describe, expect, it } from "vitest";
import type { EquipmentBalanceResult } from "../balance/model";
import { renderBalanceMetrics } from "./metrics";

function element(): HTMLElement {
  return {
    textContent: "",
    classList: {
      toggle() {},
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
    expect(elements.centerOfGravity.textContent).toContain("x 4,000");
    expect(elements.centerOfBuoyancy.textContent).toContain("z 2,200");
    expect(elements.momentArm.textContent).toContain("x 0,200");
    expect(elements.warnings.textContent).toBe("Норма");
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
  });
});
