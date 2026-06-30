import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import { buildSvg } from "./svg";

describe("svg export", () => {
  it("contains profile body, axis, station markers and UTF-8 declaration", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      slenderness: 3,
      diameter: 2,
      stations: 20,
      showGrid: true,
      showPoints: true,
    });

    const svg = buildSvg(snapshot);

    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain("<path");
    expect(svg).toContain("<line");
    expect(svg.match(/<circle/g)).toHaveLength(46);
    expect(svg).toContain('viewBox="-0.240000');
  });
});
