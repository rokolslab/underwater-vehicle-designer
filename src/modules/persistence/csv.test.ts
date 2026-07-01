import { describe, expect, it } from "vitest";
import { makeProfileSnapshot } from "../geometry/profile";
import { buildCsv } from "./csv";

describe("csv export", () => {
  it("preserves current semicolon-separated station export", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 20,
      showGrid: true,
      showPoints: true,
    });

    const csv = buildCsv(snapshot);
    const rows = csv.split("\n");

    expect(rows[0]).toBe("N;x;y_top;y_bottom");
    expect(rows).toHaveLength(24);
    expect(rows[1]).toBe("1;0;0;0");
    expect(rows.at(-1)).toBe("23;6;0;0");
  });

  it("keeps station coordinates within the declared total length when insert is present", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 20,
      showGrid: true,
      showPoints: true,
    });

    const rows = buildCsv(snapshot).split("\n");

    expect(rows.at(-1)).toBe("23;6;0;0");
  });
});
