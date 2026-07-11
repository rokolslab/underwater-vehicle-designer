import { describe, expect, it } from "vitest";

import {
  bodyXFromProfileS,
  crossBodyVectors,
  oldV1PointToBody,
  profileSFromBodyX,
  subtractBodyVectors,
} from "./body-coordinates";

describe("body/profile coordinates", () => {
  it("maps profile boundaries to the centered body X axis", () => {
    expect(bodyXFromProfileS(0, 12)).toBe(6);
    expect(bodyXFromProfileS(12, 12)).toBe(-6);
    expect(profileSFromBodyX(6, 12)).toBe(0);
    expect(profileSFromBodyX(-6, 12)).toBe(12);
  });

  it("round-trips profile and body longitudinal coordinates", () => {
    const profileS = 3.25;
    expect(profileSFromBodyX(bodyXFromProfileS(profileS, 12), 12)).toBe(profileS);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid body length %s", (length) => {
    expect(() => bodyXFromProfileS(0, length)).toThrow(RangeError);
    expect(() => profileSFromBodyX(0, length)).toThrow(RangeError);
    expect(() => oldV1PointToBody({ x: 0, y: 0, z: 0 }, length)).toThrow(RangeError);
  });
});

describe("legacy v1/body coordinates", () => {
  it("maps known points into SNAME/NED body coordinates", () => {
    expect(oldV1PointToBody({ x: 0, y: 2, z: 3 }, 10)).toEqual({ x: 5, y: 3, z: -2 });
    expect(oldV1PointToBody({ x: 10, y: -2, z: -3 }, 10)).toEqual({ x: -5, y: -3, z: 2 });
  });

  it("is inverted by the documented diagnostic formulas", () => {
    const length = 10;
    const oldPoint = { x: 2, y: -4, z: 3 };
    const bodyPoint = oldV1PointToBody(oldPoint, length);

    expect({ x: length / 2 - bodyPoint.x, y: -bodyPoint.z, z: bodyPoint.y }).toEqual(oldPoint);
  });
});

describe("body vectors", () => {
  const basisX = Object.freeze({ x: 1, y: 0, z: 0 });
  const basisY = Object.freeze({ x: 0, y: 1, z: 0 });
  const basisZ = Object.freeze({ x: 0, y: 0, z: 1 });

  it("uses a right-handed SNAME/NED basis", () => {
    expect(crossBodyVectors(basisX, basisY)).toEqual(basisZ);
    expect(crossBodyVectors(basisY, basisZ)).toEqual(basisX);
    expect(crossBodyVectors(basisZ, basisX)).toEqual(basisY);
    expect(crossBodyVectors(basisY, basisX)).toEqual({ x: 0, y: 0, z: -1 });
  });

  it("subtracts body vectors component-wise", () => {
    expect(subtractBodyVectors({ x: 4, y: -2, z: 7 }, { x: 1, y: 3, z: -1 })).toEqual({
      x: 3,
      y: -5,
      z: 8,
    });
  });
});
