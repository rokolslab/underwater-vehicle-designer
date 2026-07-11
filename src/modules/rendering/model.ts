export interface RenderOptions {
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

export type Scene3dViewMode = "solid" | "x-ray" | "cutaway";
export type LongitudinalSectionPlane = "xy" | "xz";
export type SectionRetainedHalfSpace = "x<=offset" | "y<=offset" | "z<=offset";

export interface DisabledSection {
  readonly type: "disabled";
}

export interface CrossSectionX {
  readonly type: "crossSectionX";
  /** Body X in [-L/2, +L/2]; clipping retains body.x <= x. */
  readonly x: number;
}

export interface LongitudinalPlaneSection {
  readonly type: "longitudinalPlane";
  /** Body XY means z=offset; Body XZ means y=offset. */
  readonly plane: LongitudinalSectionPlane;
  /** Clipping retains z<=offset for XY and y<=offset for XZ. */
  readonly offset: number;
}

export type Scene3dSection = DisabledSection | CrossSectionX | LongitudinalPlaneSection;

export interface Scene3dSettings {
  readonly mode: Scene3dViewMode;
  readonly hullOpacity: number;
  readonly section: Scene3dSection;
}
