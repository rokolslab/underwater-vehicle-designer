import type { ProfileSnapshot } from "../geometry/model";
import { logger } from "../../shared/logger";
import { bodyXFromProfileS } from "../../shared/body-coordinates";

function formatCsvValue(value: number | string): string {
  return typeof value === "number" ? String(value).replace(".", ",") : value;
}

export function buildCsv(snapshot: ProfileSnapshot): string {
  const rows: Array<Array<number | string>> = [
    ["N", "s_m", "body_x_m", "half_breadth_y_m", "top_z_m", "bottom_z_m"],
  ];
  snapshot.stationPoints.forEach((point, index) => {
    rows.push([
      index + 1,
      point.s,
      bodyXFromProfileS(point.s, snapshot.extents.totalLength),
      point.halfBreadthY,
      -point.halfHeightZ,
      point.halfHeightZ,
    ]);
  });
  if (snapshot.stationPoints.length === 0 || snapshot.extents.totalLength <= 0) {
    logger.warn("body coordinate CSV has empty or invalid geometry", {
      exportView: "body-stations",
      projectionFrame: "Body/SNAME-NED",
      totalLength: snapshot.extents.totalLength,
      rowCount: snapshot.stationPoints.length,
    });
  }
  logger.debug("body coordinate CSV built", {
    exportView: "body-stations",
    projectionFrame: "Body/SNAME-NED",
    bodyXRange: [snapshot.extents.totalLength / 2, -snapshot.extents.totalLength / 2],
    bodyYRange: [-snapshot.extents.maxHalfBreadthY, snapshot.extents.maxHalfBreadthY],
    bodyZRange: [-snapshot.extents.maxHalfHeightZ, snapshot.extents.maxHalfHeightZ],
    rowCount: snapshot.stationPoints.length,
  });
  return rows.map((row) => row.map(formatCsvValue).join(";")).join("\n");
}
