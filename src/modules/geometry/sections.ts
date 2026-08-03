import { sectionExtentsAt } from "./profile";
import type { GeometryMode, GeometryProfileState, SectionExtents } from "./model";

export interface Section extends SectionExtents {
  readonly x: number;
  readonly area: number;
}

export function sectionArea(sectionExtents: SectionExtents): number {
  return Math.PI * sectionExtents.halfBreadthY * sectionExtents.halfHeightZ;
}

function isSectionExtents(value: GeometryProfileState | SectionExtents): value is SectionExtents {
  return "radius" in value && "halfBreadthY" in value && "halfHeightZ" in value;
}

export function makeSection(x: number, state: GeometryProfileState): Section;
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
  input: number | GeometryProfileState | SectionExtents,
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
            breadth: diameter,
            height: diameter,
            diameter,
            cylindricalInsertLength,
            stations: 1,
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
