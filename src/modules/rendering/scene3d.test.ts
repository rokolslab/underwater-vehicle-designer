import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { clippingPlanesForSection, transformClippingPlanesToWorld } from "./scene3d";

function expectVectorClose(actual: THREE.Vector3, expected: THREE.Vector3): void {
  expect(actual.x).toBeCloseTo(expected.x, 12);
  expect(actual.y).toBeCloseTo(expected.y, 12);
  expect(actual.z).toBeCloseTo(expected.z, 12);
}

describe("3d scene clipping planes", () => {
  it("builds section planes in hull-local coordinates", () => {
    expect(clippingPlanesForSection({ type: "disabled" }, 6)).toHaveLength(0);

    const [crossSection] = clippingPlanesForSection({ type: "crossSectionX", x: 4 }, 6);
    expectVectorClose(crossSection.normal, new THREE.Vector3(-1, 0, 0));
    expect(crossSection.constant).toBeCloseTo(1, 12);

    const [xySection] = clippingPlanesForSection({ type: "longitudinalPlane", plane: "xy", offset: 0.3 }, 6);
    expectVectorClose(xySection.normal, new THREE.Vector3(0, 0, -1));
    expect(xySection.constant).toBeCloseTo(0.3, 12);

    const [xzSection] = clippingPlanesForSection({ type: "longitudinalPlane", plane: "xz", offset: -0.4 }, 6);
    expectVectorClose(xzSection.normal, new THREE.Vector3(0, -1, 0));
    expect(xzSection.constant).toBeCloseTo(-0.4, 12);
  });

  it("transforms local section planes with the hull world matrix", () => {
    const [localPlane] = clippingPlanesForSection({ type: "crossSectionX", x: 4 }, 6);
    const matrixWorld = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.35, Math.PI / 2, -0.2));
    const [worldPlane] = transformClippingPlanesToWorld([localPlane], matrixWorld);

    const expectedNormal = localPlane.normal.clone().transformDirection(matrixWorld);
    const pointOnLocalPlane = new THREE.Vector3(1, 0.25, -0.5);
    const pointOnWorldPlane = pointOnLocalPlane.clone().applyMatrix4(matrixWorld);

    expectVectorClose(worldPlane.normal, expectedNormal);
    expect(worldPlane.distanceToPoint(pointOnWorldPlane)).toBeCloseTo(0, 12);
  });

  it("keeps the local section stable while the material plane rotates", () => {
    const [localPlane] = clippingPlanesForSection({ type: "longitudinalPlane", plane: "xy", offset: 0 }, 6);
    const localBefore = localPlane.clone();
    const [identityPlane] = transformClippingPlanesToWorld([localPlane], new THREE.Matrix4());
    const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.4, 0.7, 0));
    const [rotatedPlane] = transformClippingPlanesToWorld([localPlane], rotation);

    expectVectorClose(localPlane.normal, localBefore.normal);
    expect(localPlane.constant).toBeCloseTo(localBefore.constant, 12);
    expect(rotatedPlane.normal.equals(identityPlane.normal)).toBe(false);
    expect(rotatedPlane.distanceToPoint(new THREE.Vector3(0.2, 0.1, 0).applyMatrix4(rotation))).toBeCloseTo(0, 12);
  });
});
