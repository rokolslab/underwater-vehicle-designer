import { describe, expect, it } from "vitest";
import {
  bodyAxisToThree,
  bodyClippingPlaneToThree,
  bodyPointToThree,
  bodyPointToXyProjection,
  bodyPointToXzProjection,
  bodyPointToYzProjection,
  bodyVectorToThree,
  threePointToBody,
  type ThreeVector3,
} from "./coordinate-adapter";

function cross(left: ThreeVector3, right: ThreeVector3): ThreeVector3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

describe("Body to Three coordinate adapter", () => {
  it("maps all three body basis vectors", () => {
    expect(bodyAxisToThree("x")).toEqual({ x: 1, y: -0, z: 0 });
    expect(bodyAxisToThree("y")).toEqual({ x: 0, y: -0, z: 1 });
    expect(bodyAxisToThree("z")).toEqual({ x: 0, y: -1, z: 0 });
  });

  it("is right-handed and has determinant +1", () => {
    const ex = bodyAxisToThree("x");
    const ey = bodyAxisToThree("y");
    const ez = bodyAxisToThree("z");
    const determinant = ex.x * (ey.y * ez.z - ey.z * ez.y)
      - ey.x * (ex.y * ez.z - ex.z * ez.y)
      + ez.x * (ex.y * ey.z - ex.z * ey.y);

    expect(cross(ex, ey)).toEqual(ez);
    expect(determinant).toBe(1);
  });

  it("round-trips points without changing values", () => {
    const body = { x: 4.5, y: -1.25, z: 0.75 };
    expect(threePointToBody(bodyPointToThree(body))).toEqual(body);
  });

  it("uses the same mapping for free vectors", () => {
    expect(bodyVectorToThree({ x: 2, y: 3, z: 4 })).toEqual({ x: 2, y: -4, z: 3 });
  });

  it("maps clipping plane normals and preserves constants and half-space signs", () => {
    expect(bodyClippingPlaneToThree({ normal: { x: 0, y: 0, z: -1 }, constant: 0.4 })).toEqual({
      normal: { x: 0, y: 1, z: 0 },
      constant: 0.4,
    });
    expect(bodyClippingPlaneToThree({ normal: { x: 0, y: -1, z: 0 }, constant: -0.3 })).toEqual({
      normal: { x: 0, y: -0, z: -1 },
      constant: -0.3,
    });
  });
});

describe("Body to screen projection adapters", () => {
  const point = { x: 2, y: 3, z: 4 };

  it("maps signed Body X/Z into the XZ side view", () => {
    expect(bodyPointToXzProjection(point)).toEqual({ right: 2, down: 4 });
    expect(bodyPointToXzProjection({ x: -2, y: -3, z: -4 })).toEqual({ right: -2, down: -4 });
  });

  it("maps signed Body X/Y into the XY top view", () => {
    expect(bodyPointToXyProjection(point)).toEqual({ right: 2, down: 3 });
    expect(bodyPointToXyProjection({ x: -2, y: -3, z: -4 })).toEqual({ right: -2, down: -3 });
  });

  it("maps signed Body Y/Z into the YZ section view", () => {
    expect(bodyPointToYzProjection(point)).toEqual({ right: 3, down: 4 });
    expect(bodyPointToYzProjection({ x: -2, y: -3, z: -4 })).toEqual({ right: -3, down: -4 });
  });
});
