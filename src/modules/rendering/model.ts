export interface RenderOptions {
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

export type Scene3dViewMode = "solid" | "x-ray" | "cutaway";
export type LongitudinalSectionPlane = "xy" | "xz";

export interface DisabledSection {
  readonly type: "disabled";
}

export interface CrossSectionX {
  readonly type: "crossSectionX";
  readonly x: number;
}

export interface LongitudinalPlaneSection {
  readonly type: "longitudinalPlane";
  readonly plane: LongitudinalSectionPlane;
  readonly offset: number;
}

export type Scene3dSection = DisabledSection | CrossSectionX | LongitudinalPlaneSection;

export interface Scene3dSettings {
  readonly mode: Scene3dViewMode;
  readonly hullOpacity: number;
  readonly section: Scene3dSection;
}