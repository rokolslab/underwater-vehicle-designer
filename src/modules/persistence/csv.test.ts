import { describe, expect, it } from "vitest";
import type { ProfileSnapshot } from "../geometry/model";
import { makeProfileSnapshot } from "../geometry/profile";
import { buildCsv } from "./csv";

const snapshotFromRows: ProfileSnapshot = Object.freeze({
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
  smoothPoints: Object.freeze([]),
  stationPoints: Object.freeze([
    Object.freeze({ s: 0, radius: 0.1, halfBreadthY: 0.8, halfHeightZ: 0.1, topRadius: 0.25, bottomRadius: -0.35 }),
    Object.freeze({ s: 1, radius: 0.2, halfBreadthY: 0.9, halfHeightZ: 0.2, topRadius: 0.45, bottomRadius: -0.55 }),
  ]),
  extents: Object.freeze({
    maxRadius: 0.2,
    maxHalfBreadthY: 0.9,
    maxHalfHeightZ: 0.2,
    maxHeight: 0.4,
    maxRadiusS: 1,
    totalLength: 1,
  }),
});

describe("csv export", () => {
  it("exports semicolon-separated station coordinates in Body/SNAME-NED", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 20,
    });

    const csv = buildCsv(snapshot);
    const rows = csv.split("\n");

    expect(rows[0]).toBe("N;s_m;body_x_m;half_breadth_y_m;top_z_m;bottom_z_m");
    expect(rows).toHaveLength(24);
    expect(rows[1]).toBe("1;0;3;0;0;0");
    expect(rows.at(-1)).toBe("23;6;-3;0;0;0");
  });

  it("keeps station coordinates within the declared total length when insert is present", () => {
    const snapshot = makeProfileSnapshot({
      length: 6,
      breadth: 2,
      height: 2,
      slenderness: 3,
      diameter: 2,
      cylindricalInsertLength: 2,
      stations: 20,
    });

    const rows = buildCsv(snapshot).split("\n");

    expect(rows.at(-1)).toBe("23;6;-3;0;0;0");
  });

  it("uses exact snapshot half breadth and half height section extents", () => {
    const rows = buildCsv(snapshotFromRows).split("\n");

    expect(rows).toEqual([
      "N;s_m;body_x_m;half_breadth_y_m;top_z_m;bottom_z_m",
      "1;0;0.5;0.8;-0.1;0.1",
      "2;1;-0.5;0.9;-0.2;0.2",
    ]);
  });
});
