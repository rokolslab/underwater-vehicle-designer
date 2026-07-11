import type { ProfileSnapshot } from "../geometry/model";

export function buildCsv(snapshot: ProfileSnapshot): string {
  const rows: Array<Array<number | string>> = [["N", "x", "y_top", "y_bottom"]];
  snapshot.stationPoints.forEach((point, index) => {
    rows.push([index + 1, point.s, point.topRadius, point.bottomRadius]);
  });
  return rows.map((row) => row.join(";")).join("\n");
}
