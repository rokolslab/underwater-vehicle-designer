import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import type { ProfileSnapshot } from "../geometry/model";
import { makeEllipseSectionShape, sectionShapeExtents } from "../geometry/section-shape";
import { makeTheoreticalDrawing } from "../geometry/theoretical-drawing";
import { buildTheoreticalDrawingSvg } from "./theoretical-drawing-svg";

function makeEllipticalSnapshot(): ProfileSnapshot {
  const snapshot = makeProfileSnapshot({
    length: 6,
    breadth: 2,
    height: 2,
    slenderness: 3,
    diameter: 2,
    cylindricalInsertLength: 0,
    stations: 8,
  });
  return Object.freeze({
    ...snapshot,
    smoothPoints: Object.freeze(
      snapshot.smoothPoints.map((point) => {
        const shape = makeEllipseSectionShape(point.halfBreadthY * 2, point.halfHeightZ);
        return Object.freeze({ ...point, shape, ...sectionShapeExtents(shape) });
      }),
    ),
    stationPoints: Object.freeze(
      snapshot.stationPoints.map((point) => {
        const shape = makeEllipseSectionShape(point.halfBreadthY * 2, point.halfHeightZ);
        return Object.freeze({ ...point, shape, ...sectionShapeExtents(shape) });
      }),
    ),
    extents: Object.freeze({
      ...snapshot.extents,
      maxHalfBreadthY: snapshot.extents.maxHalfBreadthY * 2,
    }),
  });
}

describe("theoretical drawing SVG export", () => {
  it("uses the shared body projections and preserves source curve counts", () => {
    const drawing = makeTheoreticalDrawing(makeProfileSnapshot({
      length: 6,
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 8,
    }));

    const svg = buildTheoreticalDrawingSvg(drawing);

    expect(svg).toContain("нос (+X)");
    expect(svg).toContain("+Y правый борт");
    expect(svg).toContain("правый борт (+Y)");
    expect(svg).toContain("+Z вниз");
    expect(svg).toContain("B=2.000 м; H=2.000 м");
    expect(svg).not.toContain("D=2.000 м");
    expect(svg.match(/class=\"section-curve\"/g)).toHaveLength(
      drawing.profileButtockCurves.length * 2 + drawing.halfBreadthWaterlineCurves.length,
    );
    expect(svg.match(/class=\"section-forward\"/g)).toHaveLength(drawing.forwardSections.length);
    expect(svg.match(/class=\"section-aft\"/g)).toHaveLength(drawing.aftSections.length);
    expect(drawing.profilePoints[0]).toEqual({ s: 0, radius: 0 });
    expect(drawing.profilePoints.at(-1)).toEqual({ s: drawing.totalLength, radius: 0 });
  });

  it("uses shape-derived section contours in body-plan paths", () => {
    const drawing = makeTheoreticalDrawing(makeEllipticalSnapshot());
    const svg = buildTheoreticalDrawingSvg(drawing);
    const sectionPath = svg.match(/<path d="([^"]+)" class="section-midship"/u)?.[1] ?? "";
    const coordinates = [...sectionPath.matchAll(/[ML]([0-9.]+) ([0-9.]+)/gu)].map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
    const xSpan = Math.max(...coordinates.map((point) => point.x)) - Math.min(...coordinates.map((point) => point.x));
    const ySpan = Math.max(...coordinates.map((point) => point.y)) - Math.min(...coordinates.map((point) => point.y));

    expect(sectionPath).not.toContain("A");
    expect(coordinates.length).toBeGreaterThan(16);
    expect(xSpan).toBeGreaterThan(ySpan * 1.5);
  });
});
