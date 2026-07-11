import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import { makeTheoreticalDrawing } from "../geometry/theoretical-drawing";
import { buildTheoreticalDrawingSvg } from "./theoretical-drawing-svg";

describe("theoretical drawing SVG export", () => {
  it("uses the shared body projections and preserves source curve counts", () => {
    const drawing = makeTheoreticalDrawing(makeProfileSnapshot({
      length: 6,
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
});
