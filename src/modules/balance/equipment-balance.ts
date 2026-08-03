import {
  equipmentCenter,
  equipmentDisplacedVolume,
  validateEquipmentItem,
  type EquipmentItem,
} from "../equipment/model";
import type { BodyPoint3, BodyVector3 } from "../../shared/body-coordinates";
import type { BalanceWarning, BalanceWarningCode, EquipmentBalanceInput, EquipmentBalanceResult } from "./model";
import { calculateStability, normalizeAlignmentToleranceM } from "./stability";

export const DEFAULT_WATER_DENSITY_KG_PER_M3 = 1025;
export const DEFAULT_GRAVITY_M_PER_S2 = 9.80665;

const zeroVector: BodyPoint3 = Object.freeze({ x: 0, y: 0, z: 0 });

interface Accumulator {
  readonly totalMassKg: number;
  readonly displacedVolumeM3: number;
  readonly weightedMassCenter: BodyVector3;
  readonly weightedVolumeCenter: BodyVector3;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function warning(code: BalanceWarningCode, message: string, equipmentId?: string): BalanceWarning {
  return Object.freeze({ code, message, ...(equipmentId ? { equipmentId } : {}) });
}

function addWeightedVector(current: BodyVector3, center: BodyPoint3, weight: number): BodyVector3 {
  return Object.freeze({
    x: current.x + center.x * weight,
    y: current.y + center.y * weight,
    z: current.z + center.z * weight,
  });
}

function divideVector(vector: BodyVector3, divisor: number): BodyPoint3 {
  if (!isPositiveFinite(divisor)) return zeroVector;
  return Object.freeze({ x: vector.x / divisor, y: vector.y / divisor, z: vector.z / divisor });
}

function momentArm(centerOfBuoyancy: BodyPoint3, centerOfGravity: BodyPoint3): BodyVector3 {
  return Object.freeze({
    x: centerOfBuoyancy.x - centerOfGravity.x,
    y: centerOfBuoyancy.y - centerOfGravity.y,
    z: centerOfBuoyancy.z - centerOfGravity.z,
  });
}

function emptyResult(warnings: readonly BalanceWarning[], alignmentToleranceM: number): EquipmentBalanceResult {
  return Object.freeze({
    buoyancyModel: "equipmentDisplacedVolume",
    isValid: false,
    totalMassKg: 0,
    displacedVolumeM3: 0,
    weightN: 0,
    buoyancyForceN: 0,
    netBuoyancyN: 0,
    centerOfGravity: zeroVector,
    centerOfBuoyancy: zeroVector,
    momentArm: zeroVector,
    deltaX: 0,
    deltaY: 0,
    bgM: 0,
    isVerticallyStable: false,
    alignmentToleranceM,
    momentNm: zeroVector,
    restoringMomentNm: zeroVector,
    warnings: Object.freeze([...warnings]),
  });
}

function accumulateEquipment(items: readonly EquipmentItem[], warnings: BalanceWarning[]): Accumulator {
  let totalMassKg = 0;
  let displacedVolumeM3 = 0;
  let weightedMassCenter: BodyVector3 = zeroVector;
  let weightedVolumeCenter: BodyVector3 = zeroVector;

  for (const item of items) {
    const validation = validateEquipmentItem(item);
    if (!validation.isValid) {
      warnings.push(warning("invalidEquipment", validation.reason ?? "Данные оборудования некорректны.", item.id));
      continue;
    }

    const center = equipmentCenter(item);
    const volume = equipmentDisplacedVolume(item);
    totalMassKg += item.massKg;
    displacedVolumeM3 += volume;
    weightedMassCenter = addWeightedVector(weightedMassCenter, center, item.massKg);
    weightedVolumeCenter = addWeightedVector(weightedVolumeCenter, center, volume);
  }

  return Object.freeze({ totalMassKg, displacedVolumeM3, weightedMassCenter, weightedVolumeCenter });
}

export function calculateEquipmentBalance(input: EquipmentBalanceInput): EquipmentBalanceResult {
  const waterDensityKgPerM3 = input.waterDensityKgPerM3 ?? DEFAULT_WATER_DENSITY_KG_PER_M3;
  const gravityMPerS2 = input.gravityMPerS2 ?? DEFAULT_GRAVITY_M_PER_S2;
  const warnings: BalanceWarning[] = [];
  const alignmentToleranceM = normalizeAlignmentToleranceM(input.alignmentToleranceM);
  warnings.push(
    warning(
      "equipmentOnlyBuoyancyModel",
      "Center of buoyancy is weighted only by equipment displaced volumes and is not the center of buoyancy of the external watertight hull.",
    ),
  );

  if (input.equipment.length === 0) {
    warnings.push(warning("emptyEquipment", "No equipment is available for balance calculation."));
  }

  if (!isPositiveFinite(waterDensityKgPerM3)) {
    warnings.push(warning("invalidWaterDensity", "Water density must be a positive finite number."));
  }

  if (!isPositiveFinite(gravityMPerS2)) {
    warnings.push(warning("invalidGravity", "Gravity must be a positive finite number."));
  }

  const accumulator = accumulateEquipment(input.equipment, warnings);
  if (
    input.equipment.length === 0 ||
    !isPositiveFinite(waterDensityKgPerM3) ||
    !isPositiveFinite(gravityMPerS2) ||
    !isPositiveFinite(accumulator.totalMassKg) ||
    !isPositiveFinite(accumulator.displacedVolumeM3)
  ) {
    return emptyResult(warnings, alignmentToleranceM);
  }

  const centerOfGravity = divideVector(accumulator.weightedMassCenter, accumulator.totalMassKg);
  const centerOfBuoyancy = divideVector(accumulator.weightedVolumeCenter, accumulator.displacedVolumeM3);
  const weightN = accumulator.totalMassKg * gravityMPerS2;
  const buoyancyForceN = accumulator.displacedVolumeM3 * waterDensityKgPerM3 * gravityMPerS2;
  const netBuoyancyN = buoyancyForceN - weightN;
  const arm = momentArm(centerOfBuoyancy, centerOfGravity);
  const stability = calculateStability({
    centerOfGravity,
    centerOfBuoyancy,
    weightN,
    buoyancyForceN,
    origin: input.momentOrigin,
    rollRad: input.rollRad,
    pitchRad: input.pitchRad,
    alignmentToleranceM,
  });

  if (netBuoyancyN <= 0) {
    warnings.push(warning("nonPositiveBuoyancy", "Net buoyancy is zero or negative."));
  }

  if (!stability.isVerticallyStable) {
    warnings.push(warning("unstableVerticalCenters", "Center of buoyancy is not above center of gravity in body/NED."));
  }

  if (Math.abs(stability.deltaX) > stability.alignmentToleranceM) {
    warnings.push(warning("longitudinalCentersMisaligned", "Longitudinal CG/CB offset exceeds tolerance."));
  }

  if (Math.abs(stability.deltaY) > stability.alignmentToleranceM) {
    warnings.push(warning("transverseCentersMisaligned", "Transverse CG/CB offset exceeds tolerance."));
  }

  const result = Object.freeze({
    buoyancyModel: "equipmentDisplacedVolume" as const,
    isValid: !warnings.some((item) =>
      item.code === "emptyEquipment" || item.code === "invalidEquipment" || item.code === "invalidWaterDensity" || item.code === "invalidGravity",
    ),
    totalMassKg: accumulator.totalMassKg,
    displacedVolumeM3: accumulator.displacedVolumeM3,
    weightN,
    buoyancyForceN,
    netBuoyancyN,
    centerOfGravity,
    centerOfBuoyancy,
    momentArm: arm,
    deltaX: stability.deltaX,
    deltaY: stability.deltaY,
    bgM: stability.bgM,
    isVerticallyStable: stability.isVerticallyStable,
    alignmentToleranceM: stability.alignmentToleranceM,
    momentNm: stability.momentNm,
    restoringMomentNm: stability.restoringMomentNm,
    warnings: Object.freeze([...warnings]),
  });

  return result;
}
