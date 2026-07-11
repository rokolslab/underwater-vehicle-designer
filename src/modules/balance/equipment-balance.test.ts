import { describe, expect, it } from "vitest";
import type { EquipmentItem } from "../equipment/model";
import { calculateEquipmentBalance, DEFAULT_GRAVITY_M_PER_S2, DEFAULT_WATER_DENSITY_KG_PER_M3 } from "./equipment-balance";

const sphere: EquipmentItem = Object.freeze({
  id: "sphere-1",
  name: "Sphere",
  shape: "sphere",
  massKg: 10,
  position: Object.freeze({ x: 1, y: 0, z: -1 }),
  orientation: "x",
  dimensions: Object.freeze({ radius: 0.5 }),
  displacedVolume: 0.02,
});

const box: EquipmentItem = Object.freeze({
  id: "box-1",
  name: "Box",
  shape: "box",
  massKg: 30,
  position: Object.freeze({ x: 5, y: 2, z: 3 }),
  orientation: "z",
  dimensions: Object.freeze({ lengthX: 1, breadthY: 1, heightZ: 1 }),
  displacedVolume: 0.08,
});

function warningCodes(result: ReturnType<typeof calculateEquipmentBalance>): readonly string[] {
  return result.warnings.map((warning) => warning.code);
}

describe("equipment balance", () => {
  it("returns an invalid empty result without equipment", () => {
    const result = calculateEquipmentBalance({ equipment: [] });

    expect(result.isValid).toBe(false);
    expect(result.totalMassKg).toBe(0);
    expect(result.displacedVolumeM3).toBe(0);
    expect(result.centerOfGravity).toEqual({ x: 0, y: 0, z: 0 });
    expect(warningCodes(result)).toContain("emptyEquipment");
  });

  it("calculates balance for one equipment item", () => {
    const result = calculateEquipmentBalance({ equipment: [sphere] });

    expect(result.totalMassKg).toBe(10);
    expect(result.displacedVolumeM3).toBe(0.02);
    expect(result.weightN).toBeCloseTo(10 * DEFAULT_GRAVITY_M_PER_S2, 12);
    expect(result.buoyancyForceN).toBeCloseTo(0.02 * DEFAULT_WATER_DENSITY_KG_PER_M3 * DEFAULT_GRAVITY_M_PER_S2, 12);
    expect(result.centerOfGravity).toEqual({ x: 1, y: 0, z: -1 });
    expect(result.centerOfBuoyancy).toEqual({ x: 1, y: 0, z: -1 });
  });

  it("weights center of gravity by mass and center of buoyancy by displaced volume", () => {
    const result = calculateEquipmentBalance({ equipment: [sphere, box] });

    expect(result.totalMassKg).toBe(40);
    expect(result.displacedVolumeM3).toBeCloseTo(0.1, 12);
    expect(result.centerOfGravity.x).toBeCloseTo((10 * 1 + 30 * 5) / 40, 12);
    expect(result.centerOfGravity.y).toBeCloseTo((10 * 0 + 30 * 2) / 40, 12);
    expect(result.centerOfGravity.z).toBeCloseTo((10 * -1 + 30 * 3) / 40, 12);
    expect(result.centerOfBuoyancy.x).toBeCloseTo((0.02 * 1 + 0.08 * 5) / 0.1, 12);
    expect(result.centerOfBuoyancy.y).toBeCloseTo((0.02 * 0 + 0.08 * 2) / 0.1, 12);
    expect(result.centerOfBuoyancy.z).toBeCloseTo((0.02 * -1 + 0.08 * 3) / 0.1, 12);
    expect(result.momentArm.x).toBeCloseTo(result.centerOfBuoyancy.x - result.centerOfGravity.x, 12);
  });

  it("uses geometric volume when displaced volume is not explicit", () => {
    const implicitVolume = { ...sphere, displacedVolume: undefined } satisfies EquipmentItem;
    const result = calculateEquipmentBalance({ equipment: [implicitVolume] });

    expect(result.displacedVolumeM3).toBeCloseTo((4 / 3) * Math.PI * 0.5 ** 3, 12);
  });

  it("reports invalid equipment and skips it from aggregates", () => {
    const invalid = { ...sphere, id: "bad", massKg: 0 } satisfies EquipmentItem;
    const result = calculateEquipmentBalance({ equipment: [invalid, box] });

    expect(result.isValid).toBe(false);
    expect(result.totalMassKg).toBe(30);
    expect(result.displacedVolumeM3).toBe(0.08);
    expect(warningCodes(result)).toContain("invalidEquipment");
  });

  it("rejects invalid water density and gravity", () => {
    const result = calculateEquipmentBalance({ equipment: [sphere], waterDensityKgPerM3: 0, gravityMPerS2: Number.NaN });

    expect(result.isValid).toBe(false);
    expect(result.weightN).toBe(0);
    expect(warningCodes(result)).toContain("invalidWaterDensity");
    expect(warningCodes(result)).toContain("invalidGravity");
  });

  it("warns when buoyancy is not positive", () => {
    const heavy = { ...sphere, massKg: 10_000, displacedVolume: 0.01 } satisfies EquipmentItem;
    const result = calculateEquipmentBalance({ equipment: [heavy] });

    expect(result.netBuoyancyN).toBeLessThan(0);
    expect(warningCodes(result)).toContain("nonPositiveBuoyancy");
  });

  it("warns when center of buoyancy is not above center of gravity", () => {
    const lowerVolume = { ...sphere, position: { x: 0, y: 0, z: -2 }, massKg: 1, displacedVolume: 0.09 } satisfies EquipmentItem;
    const higherMass = { ...box, position: { x: 0, y: 0, z: 2 }, massKg: 100, displacedVolume: 0.01 } satisfies EquipmentItem;
    const result = calculateEquipmentBalance({ equipment: [lowerVolume, higherMass] });

    expect(result.centerOfBuoyancy.z).toBeLessThan(result.centerOfGravity.z);
    expect(warningCodes(result)).toContain("unstableVerticalCenters");
  });
});
