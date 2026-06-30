export interface ProfileState {
  readonly length: number;
  readonly slenderness: number;
  readonly diameter: number;
  readonly stations: number;
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

export interface SmoothPoint {
  readonly x: number;
  readonly y: number;
}

export interface StationPoint {
  readonly x: number;
  readonly yTop: number;
  readonly yBottom: number;
}

export interface ProfileExtents {
  readonly maxRadius: number;
  readonly maxHeight: number;
  readonly maxX: number;
}

export interface ProfileSnapshot {
  readonly state: ProfileState;
  readonly smoothPoints: readonly SmoothPoint[];
  readonly stationPoints: readonly StationPoint[];
  readonly extents: ProfileExtents;
}
