export interface ProfileState {
  readonly length: number;
  readonly slenderness: number;
  readonly diameter: number;
  readonly cylindricalInsertLength: number;
  readonly stations: number;
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

export interface ProfilePoint {
  readonly s: number;
  readonly radius: number;
}

export interface StationPoint {
  readonly s: number;
  readonly topRadius: number;
  readonly bottomRadius: number;
}

export interface ProfileExtents {
  readonly maxRadius: number;
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