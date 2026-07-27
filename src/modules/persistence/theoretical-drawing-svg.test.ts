import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import type { ProfileSnapshot } from "../geometry/model";
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
    showGrid: true,
    showPoints: true,
  });
  return Object.freeze({
    ...snapshot,
    smoothPoints: Object.freeze(
      snapshot.smoothPoints.map((point) => Object.freeze({ ...point, halfBreadthY: point.halfBreadthY * 2 })),
    ),
    stationPoints: Object.freeze(
      snapshot.stationPoints.map((point) => Object.freeze({ ...point, halfBreadthY: point.halfBreadthY * 2 })),
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
      showGrid: true,
      showPoints: true,
    }));

    const svg = buildTheoreticalDrawingSvg(drawing);

    expect(svg).toContain("нос (+X)");
    expect(svg).toContain("+Y правый борт");
    expect(svg).toContain("правый борт (+Y)");
    expect(svg).toContain("+Z вниз");
    expect(svg.match(/class=\"section-curve\"/g)).toHaveLength(
      drawing.profileButtockCurves.length * 2 + drawing.halfBreadthWaterlineCurves.length,
    );
    expect(svg.match(/class=\"section-forward\"/g)).toHaveLength(drawing.forwardSections.length);
    expect(svg.match(/class=\"section-aft\"/g)).toHaveLength(drawing.aftSections.length);
    expect(drawing.profilePoints[0]).toEqual({ s: 0, radius: 0 });
    expect(drawing.profilePoints.at(-1)).toEqual({ s: drawing.totalLength, radius: 0 });
  });

  it("uses exact section axes in body-plan arcs", () => {
    const drawing = makeTheoreticalDrawing(makeEllipticalSnapshot());
    const svg = buildTheoreticalDrawingSvg(drawing);
    const sectionPath = svg.match(/<path d="([^"]+)" class="section-midship"/u)?.[1] ?? "";
    const arcRadii = sectionPath.match(/A([0-9.]+) ([0-9.]+)/u);

    expect(arcRadii).not.toBeNull();
    if (arcRadii) {
      expect(Number(arcRadii[1])).toBeGreaterThan(Number(arcRadii[2]) * 1.5);
    }
  });
});
