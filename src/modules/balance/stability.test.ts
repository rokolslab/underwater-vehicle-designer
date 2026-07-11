import { describe, expect, it } from "vitest";
import { calculateStability } from "./stability";

describe("body/NED stability", () => {
  it("uses CB above CG as the stable vertical arrangement", () => {
    const stable = calculateStability({
      centerOfGravity: { x: 0, y: 0, z: 0.2 },
      centerOfBuoyancy: { x: 0, y: 0, z: -0.1 },
      weightN: 100,
      buoyancyForceN: 100,
    });

    expect(stable.bgM).toBeCloseTo(0.3, 12);
    expect(stable.isVerticallyStable).toBe(true);
  });

  it("calculates neutral roll and pitch moments with NED signs", () => {
    const result = calculateStability({
      centerOfGravity: { x: -0.2, y: 0.3, z: 0.2 },
      centerOfBuoyancy: { x: 0.4, y: -0.1, z: -0.1 },
      weightN: 100,
      buoyancyForceN: 100,
    });

    expect(result.deltaX).toBeCloseTo(0.6, 12);
    expect(result.deltaY).toBeCloseTo(-0.4, 12);
    expect(result.momentNm.x).toBeCloseTo(-100 * result.deltaY, 12);
    expect(result.momentNm.y).toBeCloseTo(100 * result.deltaX, 12);
    expect(result.momentNm.z).toBe(0);
  });

  it("returns a neutral general moment for aligned centers and equal forces", () => {
    const result = calculateStability({
      centerOfGravity: { x: 1, y: -2, z: 0.2 },
      centerOfBuoyancy: { x: 1, y: -2, z: -0.1 },
      origin: { x: -3, y: 4, z: 1 },
      weightN: 100,
      buoyancyForceN: 100,
    });

    expect(result.momentNm).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("keeps the general non-neutral moment dependent on the selected origin", () => {
    const result = calculateStability({
      centerOfGravity: { x: 1, y: 2, z: 0 },
      centerOfBuoyancy: { x: 3, y: 4, z: 0 },
      origin: { x: 1, y: 1, z: 0 },
      weightN: 80,
      buoyancyForceN: 100,
    });

    expect(result.momentNm).toEqual({ x: -220, y: 200, z: 0 });
  });

  it("calculates restoring roll and pitch moments for small angles", () => {
    const result = calculateStability({
      centerOfGravity: { x: 0, y: 0, z: 0.2 },
      centerOfBuoyancy: { x: 0, y: 0, z: -0.1 },
      weightN: 100,
      buoyancyForceN: 120,
      rollRad: 0.1,
      pitchRad: -0.2,
    });

    expect(result.restoringMomentNm.x).toBeCloseTo(-3.6, 12);
    expect(result.restoringMomentNm.y).toBeCloseTo(7.2, 12);
    expect(result.restoringMomentNm.z).toBe(0);
  });
});
