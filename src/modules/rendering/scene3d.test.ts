import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { bodyAxisToThree, bodyPointToThree, bodyVectorToThree } from "./coordinate-adapter";
import {
  bodyClippingPlaneForSection,
  clippingPlanesForSection,
  retainedHalfSpaceForSection,
  transformClippingPlanesToWorld,
} from "./scene3d";

function expectVectorClose(actual: THREE.Vector3, expected: THREE.Vector3): void {
  expect(actual.x).toBeCloseTo(expected.x, 12);
  expect(actual.y).toBeCloseTo(expected.y, 12);
  expect(actual.z).toBeCloseTo(expected.z, 12);
}

describe("3d scene clipping planes", () => {
  it("keeps nose right, Body top up, and starboard on Three +Z before drag rotation", () => {
    expect(bodyAxisToThree("x")).toEqual({ x: 1, y: -0, z: 0 });
    expect(bodyVectorToThree({ x: 0, y: 0, z: -1 })).toEqual({ x: 0, y: 1, z: 0 });
    expect(bodyAxisToThree("y")).toEqual({ x: 0, y: -0, z: 1 });
  });

  it("builds Body section planes and maps them to hull-local Three coordinates", () => {
    expect(clippingPlanesForSection({ type: "disabled" })).toHaveLength(0);

    const [crossSection] = clippingPlanesForSection({ type: "crossSectionX", x: 2 });
    expectVectorClose(crossSection.normal, new THREE.Vector3(-1, 0, 0));
    expect(crossSection.constant).toBeCloseTo(2, 12);

    const [xySection] = clippingPlanesForSection({ type: "longitudinalPlane", plane: "xy", offset: 0.3 });
    expectVectorClose(xySection.normal, new THREE.Vector3(0, 1, 0));
    expect(xySection.constant).toBeCloseTo(0.3, 12);

    const [xzSection] = clippingPlanesForSection({ type: "longitudinalPlane", plane: "xz", offset: -0.4 });
    expectVectorClose(xzSection.normal, new THREE.Vector3(0, 0, -1));
    expect(xzSection.constant).toBeCloseTo(-0.4, 12);
  });

  it.each([
    [{ type: "crossSectionX", x: 1 } as const, { x: 0.9, y: 0, z: 0 }, { x: 1.1, y: 0, z: 0 }, "x<=offset"],
    [{ type: "longitudinalPlane", plane: "xy", offset: 0.3 } as const, { x: 0, y: 0, z: 0.2 }, { x: 0, y: 0, z: 0.4 }, "z<=offset"],
    [{ type: "longitudinalPlane", plane: "xy", offset: -0.3 } as const, { x: 0, y: 0, z: -0.4 }, { x: 0, y: 0, z: -0.2 }, "z<=offset"],
    [{ type: "longitudinalPlane", plane: "xz", offset: 0.4 } as const, { x: 0, y: 0.3, z: 0 }, { x: 0, y: 0.5, z: 0 }, "y<=offset"],
    [{ type: "longitudinalPlane", plane: "xz", offset: -0.4 } as const, { x: 0, y: -0.5, z: 0 }, { x: 0, y: -0.3, z: 0 }, "y<=offset"],
  ])("retains the declared Body half-space for both offset signs", (section, retained, clipped, halfSpace) => {
    expect(retainedHalfSpaceForSection(section)).toBe(halfSpace);
    const [plane] = clippingPlanesForSection(section);
    const retainedThree = bodyPointToThree(retained);
    const clippedThree = bodyPointToThree(clipped);
    expect(plane.distanceToPoint(new THREE.Vector3(retainedThree.x, retainedThree.y, retainedThree.z))).toBeGreaterThan(0);
    expect(plane.distanceToPoint(new THREE.Vector3(clippedThree.x, clippedThree.y, clippedThree.z))).toBeLessThan(0);
  });

  it("defines Body XY as z=offset and Body XZ as y=offset", () => {
    expect(bodyClippingPlaneForSection({ type: "longitudinalPlane", plane: "xy", offset: 0.25 })).toEqual({
      normal: { x: 0, y: 0, z: -1 }, constant: 0.25,
    });
    expect(bodyClippingPlaneForSection({ type: "longitudinalPlane", plane: "xz", offset: -0.5 })).toEqual({
      normal: { x: 0, y: -1, z: 0 }, constant: -0.5,
    });
  });

  it("transforms local section planes with the hull world matrix", () => {
    const [localPlane] = clippingPlanesForSection({ type: "crossSectionX", x: 1 });
    const matrixWorld = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.35, Math.PI / 2, -0.2));
    const [worldPlane] = transformClippingPlanesToWorld([localPlane], matrixWorld);

    const expectedNormal = localPlane.normal.clone().transformDirection(matrixWorld);
    const pointOnLocalPlane = new THREE.Vector3(1, 0.25, -0.5);
    const pointOnWorldPlane = pointOnLocalPlane.clone().applyMatrix4(matrixWorld);

    expectVectorClose(worldPlane.normal, expectedNormal);
    expect(worldPlane.distanceToPoint(pointOnWorldPlane)).toBeCloseTo(0, 12);
  });

  it("keeps the local section stable while the material plane rotates", () => {
    const [localPlane] = clippingPlanesForSection({ type: "longitudinalPlane", plane: "xy", offset: 0 });
    const localBefore = localPlane.clone();
    const [identityPlane] = transformClippingPlanesToWorld([localPlane], new THREE.Matrix4());
    const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-0.4, 0.7, 0));
    const [rotatedPlane] = transformClippingPlanesToWorld([localPlane], rotation);

    expectVectorClose(localPlane.normal, localBefore.normal);
    expect(localPlane.constant).toBeCloseTo(localBefore.constant, 12);
    expect(rotatedPlane.normal.equals(identityPlane.normal)).toBe(false);
    const bodyPointOnXy = bodyPointToThree({ x: 0.2, y: 0.1, z: 0 });
    expect(rotatedPlane.distanceToPoint(
      new THREE.Vector3(bodyPointOnXy.x, bodyPointOnXy.y, bodyPointOnXy.z).applyMatrix4(rotation),
    )).toBeCloseTo(0, 12);
  });
});
