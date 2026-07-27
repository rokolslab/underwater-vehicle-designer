import { describe, expect, it } from "vitest";
import type { ProfileSnapshot } from "../geometry/model";
import { renderTable } from "./table";

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
    showGrid: true,
    showPoints: true,
  }),
  smoothPoints: Object.freeze([]),
  stationPoints: Object.freeze([
    Object.freeze({ s: 0, radius: 0.1, halfBreadthY: 0.8, halfHeightZ: 0.1, topRadius: 0.25, bottomRadius: -0.35 }),
    Object.freeze({ s: 1.5, radius: 0.2, halfBreadthY: 0.9, halfHeightZ: 0.2, topRadius: 0.45, bottomRadius: -0.55 }),
  ]),
  extents: Object.freeze({
    maxRadius: 0.2,
    maxHalfBreadthY: 0.9,
    maxHalfHeightZ: 0.2,
    maxHeight: 0.4,
    maxRadiusS: 1.5,
    totalLength: 1.5,
  }),
});

describe("coordinate table", () => {
  it("keeps existing scalar columns and renders snapshot station ordinates", () => {
    const tableBody = { innerHTML: "" } as HTMLTableSectionElement;
    const pointCount = { textContent: "" } as HTMLElement;

    renderTable(tableBody, pointCount, snapshotFromRows);

    expect(tableBody.innerHTML).toContain("<td>1</td>");
    expect(tableBody.innerHTML).toContain("<td>0,0000</td>");
    expect(tableBody.innerHTML).toContain("<td>0,2500</td>");
    expect(tableBody.innerHTML).toContain("<td>-0,3500</td>");
    expect(tableBody.innerHTML).toContain("<td>1,5000</td>");
    expect(tableBody.innerHTML).toContain("<td>0,4500</td>");
    expect(tableBody.innerHTML).toContain("<td>-0,5500</td>");
    expect(pointCount.textContent).toBe("2 параметрических станций");
  });
});
