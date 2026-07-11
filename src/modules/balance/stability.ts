import {
  crossBodyVectors,
  subtractBodyVectors,
  type BodyPoint3,
  type BodyVector3,
} from "../../shared/body-coordinates";

export const DEFAULT_ALIGNMENT_TOLERANCE_M = 0.001;

export interface StabilityInput {
  readonly centerOfGravity: BodyPoint3;
  readonly centerOfBuoyancy: BodyPoint3;
  readonly weightN: number;
  readonly buoyancyForceN: number;
  readonly origin?: BodyPoint3;
  readonly rollRad?: number;
  readonly pitchRad?: number;
  readonly alignmentToleranceM?: number;
}

export interface StabilityResult {
  readonly delta: BodyVector3;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly bgM: number;
  readonly isVerticallyStable: boolean;
  readonly alignmentToleranceM: number;
  readonly momentNm: BodyVector3;
  readonly restoringMomentNm: BodyVector3;
}

const zeroPoint: BodyPoint3 = Object.freeze({ x: 0, y: 0, z: 0 });

function addVectors(first: BodyVector3, second: BodyVector3): BodyVector3 {
  return Object.freeze({ x: first.x + second.x, y: first.y + second.y, z: first.z + second.z });
}

function finiteOrZero(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) ? value : 0;
}

export function normalizeAlignmentToleranceM(value: number | undefined): number {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_ALIGNMENT_TOLERANCE_M;
}

export function calculateStability(input: StabilityInput): StabilityResult {
  const origin = input.origin ?? zeroPoint;
  const alignmentToleranceM = normalizeAlignmentToleranceM(input.alignmentToleranceM);
  const delta = subtractBodyVectors(input.centerOfBuoyancy, input.centerOfGravity);
  const bgM = input.centerOfGravity.z - input.centerOfBuoyancy.z;
  const gravityArm = subtractBodyVectors(input.centerOfGravity, origin);
  const buoyancyArm = subtractBodyVectors(input.centerOfBuoyancy, origin);
  const weightForce: BodyVector3 = Object.freeze({ x: 0, y: 0, z: input.weightN });
  const buoyancyForce: BodyVector3 = Object.freeze({ x: 0, y: 0, z: -input.buoyancyForceN });
  const momentNm = addVectors(
    crossBodyVectors(gravityArm, weightForce),
    crossBodyVectors(buoyancyArm, buoyancyForce),
  );
  const rollRad = finiteOrZero(input.rollRad);
  const pitchRad = finiteOrZero(input.pitchRad);

  return Object.freeze({
    delta,
    deltaX: delta.x,
    deltaY: delta.y,
    bgM,
    isVerticallyStable: bgM > 0,
    alignmentToleranceM,
    momentNm,
    restoringMomentNm: Object.freeze({
      x: -input.buoyancyForceN * bgM * rollRad,
      y: -input.buoyancyForceN * bgM * pitchRad,
      z: 0,
    }),
  });
}
