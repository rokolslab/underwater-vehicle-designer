import { uniqueSorted } from "../../shared/math";
import type { ProfileExtents, ProfilePoint, SectionExtents, StationPoint } from "./model";
import { makeEllipseSectionShape, sectionShapeExtents } from "./section-shape";

const smoothSamples = 320;
const maxRadiusPositionRatio = 1 - Math.sqrt(3) / 3;
const maxRadiusBody = maxRadiusPositionRatio * (1 - maxRadiusPositionRatio) * (1 - 0.5 * maxRadiusPositionRatio);
export const PROFILE_RADIUS_NORMALIZATION = 1 / (2 * Math.sqrt(maxRadiusBody));

export function maxRadiusS(length: number): number {
  return length * maxRadiusPositionRatio;
}

export function totalProfileLength(length: number, _cylindricalInsertLength = 0): number {
  return length;
}

function normalizeCylindricalInsertLength(length: number, cylindricalInsertLength: number): number {
  return Math.min(Math.max(0, cylindricalInsertLength), length / 2);
}

export function radiusAt(s: number, length: number, diameter: number): number {
  return (diameter / 2) * shapeFactorAt(s, length);
}

export function shapeFactorAt(s: number, length: number): number {
  const t = s / length;
  const body = t * (1 - t) * (1 - 0.5 * t);
  return 2 * PROFILE_RADIUS_NORMALIZATION * Math.sqrt(Math.max(0, body));
}

function sourceSAt(s: number, length: number, cylindricalInsertLength: number): number {
  if (cylindricalInsertLength <= 0) return s;

  const normalizedInsertLength = normalizeCylindricalInsertLength(length, cylindricalInsertLength);
  const sourceLength = length - normalizedInsertLength;
  const insertStart = maxRadiusS(sourceLength);
  const insertEnd = insertStart + normalizedInsertLength;
  if (s <= insertStart) return s;
  if (s <= insertEnd) return insertStart;
  return s - normalizedInsertLength;
}

export function profileRadiusAt(
  s: number,
  length: number,
  diameter: number,
  cylindricalInsertLength = 0,
): number {
  return profileSectionExtentsAt(s, length, diameter, diameter, cylindricalInsertLength).radius;
}

export function profileShapeFactorAt(s: number, length: number, cylindricalInsertLength = 0): number {
  const normalizedInsertLength = normalizeCylindricalInsertLength(length, cylindricalInsertLength);
  const sourceLength = length - normalizedInsertLength;
  return shapeFactorAt(sourceSAt(s, length, normalizedInsertLength), sourceLength);
}

export function profileSectionExtentsAt(
  s: number,
  length: number,
  breadth: number,
  height: number,
  cylindricalInsertLength = 0,
): SectionExtents {
  const factor = profileShapeFactorAt(s, length, cylindricalInsertLength);
  const halfBreadthY = (breadth / 2) * factor;
  const halfHeightZ = (height / 2) * factor;
  const shape = makeEllipseSectionShape(halfBreadthY, halfHeightZ);
  return { shape, ...sectionShapeExtents(shape) };
}

export function makeStationPointsForSectionDimensions(
  length: number,
  breadth: number,
  height: number,
  stations: number,
  cylindricalInsertLength = 0,
): StationPoint[] {
  const totalLength = totalProfileLength(length, cylindricalInsertLength);
  const step = totalLength / stations;
  const halfStep = step / 2;
  const stationSValues = [0, halfStep];

  for (let index = 1; index < stations; index += 1) {
    stationSValues.push(index * step);
  }

  stationSValues.push(totalLength - halfStep, totalLength);

  return uniqueSorted(stationSValues).map((s) => {
    const sectionExtents = profileSectionExtentsAt(s, length, breadth, height, cylindricalInsertLength);
    return { s, ...sectionExtents, topRadius: sectionExtents.halfHeightZ, bottomRadius: -sectionExtents.halfHeightZ };
  });
}

export function makeStationPoints(
  length: number,
  diameter: number,
  stations: number,
  cylindricalInsertLength = 0,
): StationPoint[] {
  return makeStationPointsForSectionDimensions(length, diameter, diameter, stations, cylindricalInsertLength);
}

export function makeProfilePointsForSectionDimensions(
  length: number,
  breadth: number,
  height: number,
  cylindricalInsertLength = 0,
): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  const totalLength = totalProfileLength(length, cylindricalInsertLength);
  for (let index = 0; index <= smoothSamples; index += 1) {
    const s = (totalLength * index) / smoothSamples;
    points.push({ s, ...profileSectionExtentsAt(s, length, breadth, height, cylindricalInsertLength) });
  }
  return points;
}

export function makeProfilePoints(length: number, diameter: number, cylindricalInsertLength = 0): ProfilePoint[] {
  return makeProfilePointsForSectionDimensions(length, diameter, diameter, cylindricalInsertLength);
}

export function getExtents(points: readonly ProfilePoint[]): ProfileExtents {
  const maxPoint = points.reduce<ProfilePoint>(
    (best, point) => (point.radius > best.radius ? point : best),
    { s: 0, shape: makeEllipseSectionShape(0, 0), radius: 0, halfBreadthY: 0, halfHeightZ: 0 },
  );
  const maxHalfBreadthY = Math.max(0, ...points.map((point) => point.halfBreadthY));
  const maxHalfHeightZ = Math.max(0, ...points.map((point) => point.halfHeightZ));
  const totalLength = points.at(-1)?.s ?? 0;

  return {
    maxRadius: maxPoint.radius,
    maxHalfBreadthY,
    maxHalfHeightZ,
    maxHeight: maxHalfHeightZ * 2,
    maxRadiusS: maxPoint.s,
    totalLength,
  };
}
