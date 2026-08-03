export type GeometryMode = "current-formula" | "legacy-dsnp-pa";

export const defaultGeometryMode: GeometryMode = "current-formula";

export interface GeometryModePresentation {
  readonly label: string;
  readonly formulaText: string;
}

export const geometryModePresentations: Readonly<Record<GeometryMode, GeometryModePresentation>> = Object.freeze({
  "current-formula": Object.freeze({
    label: "Текущая",
    formulaText: "f(t)=t(1-t)(1-0.5t); полуоси: Y=B/2*sqrt(f/fmax), Z=H/2*sqrt(f/fmax)",
  }),
  "legacy-dsnp-pa": Object.freeze({
    label: "ДСНП_ПА",
    formulaText: "Traceability DSNP_PA: MaxWl(B) задает полуось Y, MaxBt(H) задает полуось Z",
  }),
});

export function normalizeGeometryMode(value: unknown): GeometryMode {
  return value === "current-formula" || value === "legacy-dsnp-pa" ? value : defaultGeometryMode;
}

export function geometryModePresentation(value: unknown): GeometryModePresentation {
  return geometryModePresentations[normalizeGeometryMode(value)];
}

export interface GeometryProfileState {
  readonly geometryMode?: GeometryMode;
  readonly length: number;
  /** Hull maximum breadth B along Body Y, in meters. */
  readonly breadth: number;
  /** Hull maximum height H along Body Z, in meters. */
  readonly height: number;
  readonly slenderness: number;
  /** Compatibility alias for height during the B/H transition. */
  readonly diameter: number;
  readonly cylindricalInsertLength: number;
  readonly stations: number;
}

export interface ProfileState extends GeometryProfileState {
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

export interface SectionExtents {
  /** Compatibility/display scalar by vertical half-axis `halfHeightZ`. */
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
  /** Compatibility/display top ordinate by `halfHeightZ` in profile XZ projection. */
  readonly topRadius: number;
  /** Compatibility/display bottom ordinate by `halfHeightZ` in profile XZ projection. */
  readonly bottomRadius: number;
}

export interface ProfileExtents {
  /** Compatibility/display scalar maximum by vertical half-axis `halfHeightZ`. */
  readonly maxRadius: number;
  readonly maxHalfBreadthY: number;
  readonly maxHalfHeightZ: number;
  readonly maxHeight: number;
  readonly maxRadiusS: number;
  readonly totalLength: number;
}

export interface ProfileSnapshot {
  readonly state: GeometryProfileState;
  readonly smoothPoints: readonly ProfilePoint[];
  readonly stationPoints: readonly StationPoint[];
  readonly extents: ProfileExtents;
}
