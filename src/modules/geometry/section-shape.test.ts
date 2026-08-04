import { describe, expect, it, vi } from "vitest";
import {
  containsSectionPoint,
  intersectSectionWithButtockY,
  intersectSectionWithWaterlineZ,
  makeEllipseSectionShape,
  sampleSectionContour,
  sectionArea,
  sectionShapeBounds,
  sectionShapeExtents,
} from "./section-shape";

describe("section shape geometry", () => {
  it("creates immutable ellipse shapes with compatibility extents and bounds", () => {
    const shape = makeEllipseSectionShape(2, 1);

    expect(Object.isFrozen(shape)).toBe(true);
    expect(sectionShapeExtents(shape)).toEqual({ radius: 1, halfBreadthY: 2, halfHeightZ: 1 });
    expect(sectionShapeBounds(shape)).toEqual({ minY: -2, maxY: 2, minZ: -1, maxZ: 1 });
  });

  it("calculates ellipse section area from Body Y and Z semi-axes", () => {
    const shape = makeEllipseSectionShape(2, 1);

    expect(sectionArea(shape)).toBeCloseTo(2 * Math.PI, 12);
  });

  it("checks ellipse containment for inside, boundary and outside YZ points", () => {
    const shape = makeEllipseSectionShape(2, 1);

    expect(containsSectionPoint(shape, { y: 0, z: 0 })).toBe(true);
    expect(containsSectionPoint(shape, { y: 2, z: 0 })).toBe(true);
    expect(containsSectionPoint(shape, { y: 0, z: -1 })).toBe(true);
    expect(containsSectionPoint(shape, { y: 1, z: 0.5 })).toBe(true);
    expect(containsSectionPoint(shape, { y: 1.8, z: 0.6 })).toBe(false);
    expect(containsSectionPoint(shape, { y: 2.01, z: 0 })).toBe(false);
  });

  it("samples ellipse contour from +Y through +Z, -Y and -Z", () => {
    const shape = makeEllipseSectionShape(2, 1);
    const contour = sampleSectionContour(shape, 4);

    expect(contour).toHaveLength(4);
    expect(contour[0].y).toBeCloseTo(2, 12);
    expect(contour[0].z).toBeCloseTo(0, 12);
    expect(contour[1].y).toBeCloseTo(0, 12);
    expect(contour[1].z).toBeCloseTo(1, 12);
    expect(contour[2].y).toBeCloseTo(-2, 12);
    expect(contour[2].z).toBeCloseTo(0, 12);
    expect(contour[3].y).toBeCloseTo(0, 12);
    expect(contour[3].z).toBeCloseTo(-1, 12);
  });

  it("handles zero sections without NaN containment or intersection results", () => {
    const shape = makeEllipseSectionShape(0, 0);
    const contour = sampleSectionContour(shape, 3);

    expect(sectionArea(shape)).toBe(0);
    expect(containsSectionPoint(shape, { y: 0, z: 0 })).toBe(true);
    expect(containsSectionPoint(shape, { y: 0.001, z: 0 })).toBe(false);
    expect(contour).toHaveLength(3);
    expect(contour.every((point) => point.y === 0 && point.z === 0)).toBe(true);
    expect(intersectSectionWithButtockY(shape, 0)).toEqual([{ y: 0, z: 0 }]);
    expect(intersectSectionWithWaterlineZ(shape, 0)).toEqual([{ y: 0, z: 0 }]);
    expect(intersectSectionWithButtockY(shape, 0.001)).toEqual([]);
    expect(intersectSectionWithWaterlineZ(shape, 0.001)).toEqual([]);
  });

  it("returns symmetric waterline and buttock offset intersections", () => {
    const shape = makeEllipseSectionShape(2, 1);

    expect(intersectSectionWithWaterlineZ(shape, 0.6)).toEqual([
      { y: 1.6, z: 0.6 },
      { y: -1.6, z: 0.6 },
    ]);
    expect(intersectSectionWithButtockY(shape, 1.2)).toEqual([
      { y: 1.2, z: 0.8 },
      { y: 1.2, z: -0.8 },
    ]);
    expect(intersectSectionWithWaterlineZ(shape, 1)).toEqual([{ y: 0, z: 1 }]);
    expect(intersectSectionWithButtockY(shape, 2)).toEqual([{ y: 2, z: 0 }]);
    expect(intersectSectionWithWaterlineZ(shape, 1.01)).toEqual([]);
    expect(intersectSectionWithButtockY(shape, 2.01)).toEqual([]);
  });

  it("does not write console logs from pure shape operations", () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const shape = makeEllipseSectionShape(2, 1);
      sectionShapeBounds(shape);
      sectionShapeExtents(shape);
      sectionArea(shape);
      containsSectionPoint(shape, { y: 1, z: 0.25 });
      sampleSectionContour(shape, 8);
      intersectSectionWithWaterlineZ(shape, 0.5);
      intersectSectionWithButtockY(shape, 0.5);
    } finally {
      expect(debugSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      debugSpy.mockRestore();
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
