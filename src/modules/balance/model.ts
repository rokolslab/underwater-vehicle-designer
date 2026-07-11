import type { BodyPoint3, BodyVector3 } from "../../shared/body-coordinates";
import type { EquipmentItem } from "../equipment/model";

export interface HullBuoyancyInput {
  readonly length: number;
  readonly diameter: number;
}

export interface HullBuoyancyResult {
  readonly isValid: boolean;
  readonly displacedVolume: number;
  readonly center: BodyPoint3;
  readonly reason?: string;
}

export type BalanceWarningCode =
  | "emptyEquipment"
  | "invalidEquipment"
  | "invalidWaterDensity"
  | "invalidGravity"
  | "nonPositiveBuoyancy"
  | "unstableVerticalCenters";

export interface BalanceWarning {
  readonly code: BalanceWarningCode;
  readonly message: string;
  readonly equipmentId?: string;
}

export type BalanceMomentArm = BodyVector3;

export interface BalanceSettings {
  readonly waterDensityKgPerM3: number;
  readonly gravityMPerS2: number;
}

export interface EquipmentBalanceInput {
  readonly equipment: readonly EquipmentItem[];
  readonly waterDensityKgPerM3?: number;
  readonly gravityMPerS2?: number;
}

export interface EquipmentBalanceResult {
  readonly isValid: boolean;
  readonly totalMassKg: number;
  readonly displacedVolumeM3: number;
  readonly weightN: number;
  readonly buoyancyForceN: number;
  readonly netBuoyancyN: number;
  readonly centerOfGravity: BodyPoint3;
  readonly centerOfBuoyancy: BodyPoint3;
  readonly momentArm: BalanceMomentArm;
  readonly warnings: readonly BalanceWarning[];
}
