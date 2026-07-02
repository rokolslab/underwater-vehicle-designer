import { PROFILE_RADIUS_NORMALIZATION } from "../geometry/profile";
import type { HullBuoyancyInput, HullBuoyancyResult, Vector3 } from "./model";

const zeroCenter: Vector3 = Object.freeze({ x: 0, y: 0, z: 0 });

function invalidResult(reason: string): HullBuoyancyResult {
  return Object.freeze({
    isValid: false,
    displacedVolume: 0,
    center: zeroCenter,
    reason,
  });
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** @deprecated Legacy internal hull-volume calculation. Do not use for ЦВК geometry. */
export function calculateHullCenterOfBuoyancy(input: HullBuoyancyInput): HullBuoyancyResult {
  if (!isPositiveFinite(input.length)) {
    return invalidResult("length must be a positive finite number");
  }

  if (!isPositiveFinite(input.diameter)) {
    return invalidResult("diameter must be a positive finite number");
  }

  const radiusScale = PROFILE_RADIUS_NORMALIZATION * input.diameter;
  const displacedVolume = (Math.PI * radiusScale * radiusScale * input.length) / 8;
  const center = Object.freeze({
    x: (7 * input.length) / 15,
    y: 0,
    z: 0,
  });

  return Object.freeze({
    isValid: true,
    displacedVolume,
    center,
  });
}
