import { describe, expect, it } from "vitest";
import type { ProfileSnapshot } from "../geometry/model";
import { makeProfileSnapshot } from "../geometry/profile";
import { makeEllipseSectionShape, sectionShapeExtents } from "../geometry/section-shape";
import { buildSvg } from "./svg";

function profilePoint(s: number, halfBreadthY: number, halfHeightZ: number) {
  const shape = makeEllipseSectionShape(halfBreadthY, halfHeightZ);
  return Object.freeze({ s, shape, ...sectionShapeExtents(shape) });
}

const snapshotFromProfilePoints: ProfileSnapshot = Object.freeze({
  state: Object.freeze({
    geometryMode: "legacy-dsnp-pa",
    length: 99,
    breadth: 9,
    height: 9,
    slenderness: 9,
    diameter: 9,
    cylindricalInsertLength: 0,
    stations: 3,
  }),
  smoothPoints: Object.freeze([
    profilePoint(0, 0.8, 0.2),
    profilePoint(1, 1.2, 0.4),
    profilePoint(2, 0.6, 0.1),
  ]),
  stationPoints: Object.freeze([
    Object.freeze({ ...profilePoint(1, 1.2, 0.4), topRadius: 0.3, bottomRadius: -0.7 }),
  ]),
  extents: Object.freeze({
    maxRadius: 0.4,
    maxHalfBreadthY: 1.2,
    maxHalfHeightZ: 0.4,
    maxHeight: 0.8,
    maxRadiusS: 1,
    totalLength: 2,
  }),
});

describe("svg export", () => {
  it("contains profile body, axis, station markers and UTF-8 declaration", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 20,
    });

    const svg = buildSvg(snapshot);

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain("<path");
    expect(svg).toContain("<line");
    expect(svg.match(/<circle/g)).toHaveLength(46);
    expect(svg).toContain('viewBox="-3.240000');
    expect(svg).toContain('нос (+X)');
    expect(svg).toContain('+Z вниз');
    expect(svg).toContain('M3.000000 0.000000');
  });

  it("keeps the declared total profile length in the viewBox when insert is present", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 20,
    });

    const svg = buildSvg(snapshot);

    expect(svg).toContain('viewBox="-3.240000');
    expect(svg).toContain('x1="-3.000000"');
    expect(svg).toContain('x2="3.000000"');
  });

  it("uses snapshot profile and station ordinates without recomputing state geometry", () => {
    const svg = buildSvg(snapshotFromProfilePoints);

    expect(svg).toContain('viewBox="-1.080000 -0.496000 2.160000 0.992000"');
    expect(svg).toContain('M1.000000 -0.200000 L0.000000 -0.400000 L-1.000000 -0.100000');
    expect(svg).toContain('<circle cx="0.000000" cy="-0.300000"');
    expect(svg).toContain('<circle cx="0.000000" cy="0.700000"');
  });
});
