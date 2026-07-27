export type GeometryMode = "current-formula" | "legacy-dsnp-pa";

export const defaultGeometryMode: GeometryMode = "current-formula";

export function normalizeGeometryMode(value: unknown): GeometryMode {
  return value === "current-formula" || value === "legacy-dsnp-pa" ? value : defaultGeometryMode;
}

export interface ProfileState {
  readonly geometryMode?: GeometryMode;
  readonly length: number;
  readonly slenderness: number;
  readonly diameter: number;
  readonly cylindricalInsertLength: number;
  readonly stations: number;
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

export interface SectionExtents {
  /** Compatibility/display scalar for existing circular-profile consumers. */
  readonly radius: number;
  /** Exact section semi-axis along Body +Y/-Y, in meters. */
  readonly halfBreadthY: number;
  /** Exact section semi-axis along Body +Z/-Z, in meters. */
  readonly halfHeightZ: number;
}

export interface ProfilePoint extends SectionExtents {
  readonly s: number;
}

export interface StationPoint extends SectionExtents {
  readonly s: number;
  /** Compatibility/display top ordinate in profile XZ projection. */
  readonly topRadius: number;
  /** Compatibility/display bottom ordinate in profile XZ projection. */
  readonly bottomRadius: number;
}

export interface ProfileExtents {
  /** Compatibility/display scalar maximum for existing circular-profile consumers. */
  readonly maxRadius: number;
  readonly maxHalfBreadthY: number;
  readonly maxHalfHeightZ: number;
  readonly maxHeight: number;
  readonly maxRadiusS: number;
  readonly totalLength: number;
}

export interface ProfileSnapshot {
  readonly state: ProfileState;
  readonly smoothPoints: readonly ProfilePoint[];
  readonly stationPoints: readonly StationPoint[];
  readonly extents: ProfileExtents;
}
