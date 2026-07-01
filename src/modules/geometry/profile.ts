import { uniqueSorted } from "../../shared/math";
import type { ProfileExtents, ProfileSnapshot, ProfileState, SmoothPoint, StationPoint } from "./model";

const smoothSamples = 320;
export const PROFILE_RADIUS_FACTOR = 0.972;

export function maxRadiusX(length: number): number {
  return length * (1 - Math.sqrt(3) / 3);
}

export function totalProfileLength(length: number, _cylindricalInsertLength = 0): number {
  return length;
}

function normalizeCylindricalInsertLength(length: number, cylindricalInsertLength: number): number {
  return Math.min(Math.max(0, cylindricalInsertLength), length / 2);
}

export function radiusAt(x: number, length: number, diameter: number): number {
  const t = x / length;
  const body = t * (1 - t) * (1 - 0.5 * t);
  return PROFILE_RADIUS_FACTOR * diameter * Math.sqrt(Math.max(0, body));
}

function sourceXAt(x: number, length: number, cylindricalInsertLength: number): number {
  if (cylindricalInsertLength <= 0) return x;

  const normalizedInsertLength = normalizeCylindricalInsertLength(length, cylindricalInsertLength);
  const sourceLength = length - normalizedInsertLength;
  const insertStart = maxRadiusX(sourceLength);
  const insertEnd = insertStart + normalizedInsertLength;
  if (x <= insertStart) return x;
  if (x <= insertEnd) return insertStart;
  return x - normalizedInsertLength;
}

export function profileRadiusAt(
  x: number,
  length: number,
  diameter: number,
  cylindricalInsertLength = 0,
): number {
  const normalizedInsertLength = normalizeCylindricalInsertLength(length, cylindricalInsertLength);
  const sourceLength = length - normalizedInsertLength;
  return radiusAt(sourceXAt(x, length, normalizedInsertLength), sourceLength, diameter);
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
  const xs = [0, halfStep];

  for (let index = 1; index < stations; index += 1) {
    xs.push(index * step);
  }

  xs.push(totalLength - halfStep, totalLength);

  return uniqueSorted(xs).map((x) => {
    const y = profileRadiusAt(x, length, diameter, cylindricalInsertLength);
    return { x, yTop: y, yBottom: -y };
  });
}

export function makeSmoothPoints(length: number, diameter: number, cylindricalInsertLength = 0): SmoothPoint[] {
  const points: SmoothPoint[] = [];
  const totalLength = totalProfileLength(length, cylindricalInsertLength);
  for (let index = 0; index <= smoothSamples; index += 1) {
    const x = (totalLength * index) / smoothSamples;
    points.push({ x, y: profileRadiusAt(x, length, diameter, cylindricalInsertLength) });
  }
  return points;
}

export function getExtents(points: readonly SmoothPoint[]): ProfileExtents {
  const maxPoint = points.reduce<SmoothPoint>(
    (best, point) => (point.y > best.y ? point : best),
    { x: 0, y: 0 },
  );
  const totalLength = points.at(-1)?.x ?? 0;

  return {
    maxRadius: maxPoint.y,
    maxHeight: maxPoint.y * 2,
    maxX: maxPoint.x,
    totalLength,
  };
}

export function makeProfileSnapshot(state: ProfileState): ProfileSnapshot {
  const smoothPoints = makeSmoothPoints(state.length, state.diameter, state.cylindricalInsertLength);
  const stationPoints = makeStationPoints(
    state.length,
    state.diameter,
    state.stations,
    state.cylindricalInsertLength,
  );
  const extents = getExtents(smoothPoints);

  return Object.freeze({
    state: Object.freeze({ ...state }),
    smoothPoints: Object.freeze(smoothPoints),
    stationPoints: Object.freeze(stationPoints),
    extents: Object.freeze(extents),
  });
}