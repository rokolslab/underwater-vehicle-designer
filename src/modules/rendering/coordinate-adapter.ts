import type { BodyPoint3, BodyVector3 } from "../../shared/body-coordinates";
import { bodyXFromProfileS } from "../../shared/body-coordinates";

/** Plain Three.js-frame coordinates kept free of Three.js runtime types. */
export interface ThreeVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ThreePoint3 extends ThreeVector3 {}

export interface BodyClippingPlane {
  readonly normal: BodyVector3;
  readonly constant: number;
}

export interface ThreeClippingPlane {
  readonly normal: ThreeVector3;
  readonly constant: number;
}

export type PrincipalBodyAxis = "x" | "y" | "z";

export interface ThreeEulerRotation {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const BODY_TO_THREE_AXIS_MAPPING = Object.freeze({
  x: "+three.x",
  y: "+three.z",
  z: "-three.y",
});

export function bodyVectorToThree(vector: BodyVector3): ThreeVector3 {
  return Object.freeze({ x: vector.x, y: -vector.z, z: vector.y });
}

export function threeVectorToBody(vector: ThreeVector3): BodyVector3 {
  return Object.freeze({ x: vector.x, y: vector.z, z: -vector.y });
}

export function bodyPointToThree(point: BodyPoint3): ThreePoint3 {
  return bodyVectorToThree(point);
}

/** Converts a Body plane while preserving its positive retained half-space. */
export function bodyClippingPlaneToThree(plane: BodyClippingPlane): ThreeClippingPlane {
  return Object.freeze({
    normal: bodyVectorToThree(plane.normal),
    constant: plane.constant,
  });
}

export function threePointToBody(point: ThreePoint3): BodyPoint3 {
  return threeVectorToBody(point);
}

export function profilePointToThree(profileS: number, radiusY: number, radiusZ: number, length: number): ThreePoint3 {
  return bodyPointToThree({
    x: bodyXFromProfileS(profileS, length),
    y: radiusY,
    z: radiusZ,
  });
}

export function bodyAxisToThree(axis: PrincipalBodyAxis): ThreeVector3 {
  if (axis === "x") return bodyVectorToThree({ x: 1, y: 0, z: 0 });
  if (axis === "y") return bodyVectorToThree({ x: 0, y: 1, z: 0 });
  return bodyVectorToThree({ x: 0, y: 0, z: 1 });
}

/** Rotates Three.js CylinderGeometry's local +Y axis onto a body principal axis. */
export function bodyCylinderAxisToThreeEuler(axis: PrincipalBodyAxis): ThreeEulerRotation {
  if (axis === "x") return Object.freeze({ x: 0, y: 0, z: -Math.PI / 2 });
  if (axis === "y") return Object.freeze({ x: Math.PI / 2, y: 0, z: 0 });
  return Object.freeze({ x: Math.PI, y: 0, z: 0 });
}
