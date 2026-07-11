import { bodyXFromProfileS } from "../../shared/body-coordinates";
import { logger } from "../../shared/logger";
import { uniqueSorted } from "../../shared/math";
import type { ProfileExtents, ProfileSnapshot, ProfileState, ProfilePoint, StationPoint } from "./model";

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
  const t = s / length;
  const body = t * (1 - t) * (1 - 0.5 * t);
  return diameter * PROFILE_RADIUS_NORMALIZATION * Math.sqrt(Math.max(0, body));
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
  const normalizedInsertLength = normalizeCylindricalInsertLength(length, cylindricalInsertLength);
  const sourceLength = length - normalizedInsertLength;
  return radiusAt(sourceSAt(s, length, normalizedInsertLength), sourceLength, diameter);
}

export function makeStationPoints(
  length: number,
  diameter: number,
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
    const radius = profileRadiusAt(s, length, diameter, cylindricalInsertLength);
    return { s, topRadius: radius, bottomRadius: -radius };
  });
}

export function makeProfilePoints(length: number, diameter: number, cylindricalInsertLength = 0): ProfilePoint[] {
  const points: ProfilePoint[] = [];
  const totalLength = totalProfileLength(length, cylindricalInsertLength);
  for (let index = 0; index <= smoothSamples; index += 1) {
    const s = (totalLength * index) / smoothSamples;
    points.push({ s, radius: profileRadiusAt(s, length, diameter, cylindricalInsertLength) });
  }
  return points;
}

export function getExtents(points: readonly ProfilePoint[]): ProfileExtents {
  const maxPoint = points.reduce<ProfilePoint>(
    (best, point) => (point.radius > best.radius ? point : best),
    { s: 0, radius: 0 },
  );
  const totalLength = points.at(-1)?.s ?? 0;

  return {
    maxRadius: maxPoint.radius,
    maxHeight: maxPoint.radius * 2,
    maxRadiusS: maxPoint.s,
    totalLength,
  };
}

export function makeProfileSnapshot(state: ProfileState): ProfileSnapshot {
  const smoothPoints = makeProfilePoints(state.length, state.diameter, state.cylindricalInsertLength);
  const stationPoints = makeStationPoints(
    state.length,
    state.diameter,
    state.stations,
    state.cylindricalInsertLength,
  );
  const extents = getExtents(smoothPoints);
  const firstS = smoothPoints[0]?.s ?? 0;
  const lastS = smoothPoints.at(-1)?.s ?? 0;

  logger.debug("profile snapshot built", {
    profileSRange: { min: firstS, max: lastS },
    bodyXExtents: {
      min: bodyXFromProfileS(lastS, state.length),
      max: bodyXFromProfileS(firstS, state.length),
    },
    smoothPointCount: smoothPoints.length,
    stationPointCount: stationPoints.length,
  });

  return Object.freeze({
    state: Object.freeze({ ...state }),
    smoothPoints: Object.freeze(smoothPoints),
    stationPoints: Object.freeze(stationPoints),
    extents: Object.freeze(extents),
  });
}