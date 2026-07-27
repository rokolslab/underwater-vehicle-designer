import type { ProfileSnapshot } from "../geometry/model";
import { logger } from "../../shared/logger";

export function buildCsv(snapshot: ProfileSnapshot): string {
  const rows: Array<Array<number | string>> = [["N", "s", "radius_top", "radius_bottom"]];
  snapshot.stationPoints.forEach((point, index) => {
    rows.push([index + 1, point.s, point.topRadius, point.bottomRadius]);
  });
  if (snapshot.stationPoints.length === 0 || snapshot.extents.totalLength <= 0) {
    logger.warn("parametric profile CSV has empty or invalid geometry", {
      exportView: "profile-parameters",
      projectionFrame: "Profile(s/radius)",
      totalLength: snapshot.extents.totalLength,
      rowCount: snapshot.stationPoints.length,
    });
  }
  logger.debug("parametric profile CSV built", {
    exportView: "profile-parameters",
    projectionFrame: "Profile(s/radius)",
    sRange: [0, snapshot.extents.totalLength],
    radiusRange: [-snapshot.extents.maxHalfHeightZ, snapshot.extents.maxHalfHeightZ],
    rowCount: snapshot.stationPoints.length,
  });
  return rows.map((row) => row.join(";")).join("\n");
}
