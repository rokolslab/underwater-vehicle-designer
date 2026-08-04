import { describe, expect, it } from "vitest";
import { legacyDsnpPaSectionExtentsAt } from "./legacy-dsnp-pa";
import { makeSection } from "./sections";

describe("section geometry", () => {
  it("uses the current-formula cylindrical insert plateau for radius and area", () => {
    const section = makeSection(2.5, {
      geometryMode: "current-formula",
      length: 6,
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 20,
    });

    expect(section.radius).toBeCloseTo(1, 12);
    expect(section.shape.kind).toBe("ellipse");
    expect(section.halfBreadthY).toBeCloseTo(1, 12);
    expect(section.halfHeightZ).toBeCloseTo(1, 12);
    expect(section.shape.halfBreadthY).toBeCloseTo(section.halfBreadthY, 12);
    expect(section.shape.halfHeightZ).toBeCloseTo(section.halfHeightZ, 12);
    expect(section.area).toBeCloseTo(Math.PI, 12);
  });

  it("keeps legacy elliptical section area based on exact half breadth and half height", () => {
    const sectionExtents = legacyDsnpPaSectionExtentsAt({
      s: 4,
      length: 10,
      maxBreadth: 4,
      maxHeight: 2,
      cylindricalInsertLength: 2,
    });
    const section = makeSection(4, sectionExtents);

    expect(section.radius).toBeCloseTo(1, 12);
    expect(section.shape.kind).toBe("ellipse");
    expect(section.halfBreadthY).toBeCloseTo(2, 12);
    expect(section.halfHeightZ).toBeCloseTo(1, 12);
    expect(section.shape.halfBreadthY).toBeCloseTo(section.halfBreadthY, 12);
    expect(section.shape.halfHeightZ).toBeCloseTo(section.halfHeightZ, 12);
    expect(section.area).toBeCloseTo(Math.PI * 2 * 1, 12);
  });

  it("uses current-formula elliptical half axes for section area", () => {
    const section = makeSection(2.5358983848622456, {
      geometryMode: "current-formula",
      length: 6,
      breadth: 4,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 20,
    });

    expect(section.halfBreadthY).toBeCloseTo(2, 12);
    expect(section.halfHeightZ).toBeCloseTo(1, 12);
    expect(section.area).toBeCloseTo(Math.PI * 2 * 1, 12);
  });
});
