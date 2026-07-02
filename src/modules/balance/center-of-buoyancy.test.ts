import { describe, expect, it } from "vitest";
import { PROFILE_RADIUS_NORMALIZATION } from "../geometry/profile";
import { calculateHullCenterOfBuoyancy } from "./center-of-buoyancy";

describe("legacy hull center of buoyancy", () => {
  it("calculates displaced volume and center for the current formula", () => {
    const result = calculateHullCenterOfBuoyancy({ length: 6, diameter: 2 });

    expect(result.isValid).toBe(true);
    expect(result.displacedVolume).toBeCloseTo((Math.PI * (PROFILE_RADIUS_NORMALIZATION * 2) ** 2 * 6) / 8, 12);
    expect(result.center.x).toBeCloseTo(2.8, 12);
    expect(result.center.y).toBe(0);
    expect(result.center.z).toBe(0);
  });

  it("scales volume with length and squared diameter", () => {
    const base = calculateHullCenterOfBuoyancy({ length: 6, diameter: 2 });
    const doubleLength = calculateHullCenterOfBuoyancy({ length: 12, diameter: 2 });
    const doubleDiameter = calculateHullCenterOfBuoyancy({ length: 6, diameter: 4 });

    expect(doubleLength.displacedVolume).toBeCloseTo(base.displacedVolume * 2, 12);
    expect(doubleLength.center.x).toBeCloseTo(base.center.x * 2, 12);
    expect(doubleDiameter.displacedVolume).toBeCloseTo(base.displacedVolume * 4, 12);
    expect(doubleDiameter.center.x).toBeCloseTo(base.center.x, 12);
  });

  it("returns a structured invalid result for impossible geometry", () => {
    const invalidLength = calculateHullCenterOfBuoyancy({ length: 0, diameter: 2 });
    const invalidDiameter = calculateHullCenterOfBuoyancy({ length: 6, diameter: Number.NaN });

    expect(invalidLength.isValid).toBe(false);
    expect(invalidLength.displacedVolume).toBe(0);
    expect(invalidLength.center).toEqual({ x: 0, y: 0, z: 0 });
    expect(invalidLength.reason).toContain("length");
    expect(invalidDiameter.isValid).toBe(false);
    expect(invalidDiameter.reason).toContain("diameter");
  });
});
