import { sectionExtentsAt } from "./profile";
import type { GeometryMode, ProfileState, SectionExtents } from "./model";

export interface Section extends SectionExtents {
  readonly x: number;
  readonly area: number;
}

export function sectionArea(sectionExtents: SectionExtents): number {
  return Math.PI * sectionExtents.halfBreadthY * sectionExtents.halfHeightZ;
}

function isSectionExtents(value: ProfileState | SectionExtents): value is SectionExtents {
  return "radius" in value && "halfBreadthY" in value && "halfHeightZ" in value;
}

export function makeSection(x: number, state: ProfileState): Section;
export function makeSection(x: number, sectionExtents: SectionExtents): Section;
export function makeSection(
  x: number,
  length: number,
  diameter: number,
  cylindricalInsertLength?: number,
  geometryMode?: GeometryMode,
): Section;
export function makeSection(
  x: number,
  input: number | ProfileState | SectionExtents,
  diameter = 0,
  cylindricalInsertLength = 0,
  geometryMode?: GeometryMode,
): Section {
  const sectionExtents =
    typeof input === "number"
      ? sectionExtentsAt(
          {
            geometryMode,
            length: input,
            slenderness: diameter === 0 ? 0 : input / diameter,
            diameter,
            cylindricalInsertLength,
            stations: 1,
            showGrid: false,
            showPoints: false,
          },
          x,
        )
      : isSectionExtents(input)
        ? input
        : sectionExtentsAt(input, x);

  return {
    x,
    ...sectionExtents,
    area: sectionArea(sectionExtents),
  };
}
