import type { SectionExtents } from "./model";
import { makeEllipseSectionShape, sectionShapeExtents } from "./section-shape";

export interface LegacyDsnpPaSectionInput {
  readonly s: number;
  readonly length: number;
  readonly maxBreadth: number;
  readonly maxHeight: number;
  readonly cylindricalInsertLength: number;
}

export function profileStationToLegacyX(s: number, length: number): number {
  return s / length;
}

export function cylindricalInsertLengthToLegacyLc(cylindricalInsertLength: number, length: number): number {
  return cylindricalInsertLength / length;
}

function legacyDsnpPaMaxHalfAxis(normalizedX: number, normalizedCylindricalInsertLength: number, fullAxis: number): number {
  const lc = normalizedCylindricalInsertLength;
  const plateauStart = 0.4 * (1 - lc);
  const plateauEnd = 0.4 + 0.6 * lc;
  if (normalizedX > plateauStart && normalizedX < plateauEnd) return fullAxis / 2;

  const profileX = normalizedX <= plateauStart ? normalizedX / (1 - lc) : (normalizedX - lc) / (1 - lc);
  return 0.9731 * fullAxis * Math.sqrt(profileX * (1 - profileX) * (1.5 - profileX));
}

// APPAUNIT.PAS MaxWl: maximum section half-breadth from normalized x, lc and full breadth B.
export function legacyDsnpPaMaxHalfBreadth(
  normalizedX: number,
  normalizedCylindricalInsertLength: number,
  maxBreadth: number,
): number {
  return legacyDsnpPaMaxHalfAxis(normalizedX, normalizedCylindricalInsertLength, maxBreadth);
}

// APPAUNIT.PAS MaxBt: maximum section half-height from normalized x, lc and full height H.
export function legacyDsnpPaMaxHalfHeight(
  normalizedX: number,
  normalizedCylindricalInsertLength: number,
  maxHeight: number,
): number {
  return legacyDsnpPaMaxHalfAxis(normalizedX, normalizedCylindricalInsertLength, maxHeight);
}

export function legacyDsnpPaSectionExtentsAt(input: LegacyDsnpPaSectionInput): SectionExtents {
  const normalizedX = profileStationToLegacyX(input.s, input.length);
  const normalizedCylindricalInsertLength = cylindricalInsertLengthToLegacyLc(
    input.cylindricalInsertLength,
    input.length,
  );
  const halfBreadthY = legacyDsnpPaMaxHalfBreadth(normalizedX, normalizedCylindricalInsertLength, input.maxBreadth);
  const halfHeightZ = legacyDsnpPaMaxHalfHeight(normalizedX, normalizedCylindricalInsertLength, input.maxHeight);
  const shape = makeEllipseSectionShape(halfBreadthY, halfHeightZ);

  return { shape, ...sectionShapeExtents(shape) };
}
