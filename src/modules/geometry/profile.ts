import { uniqueSorted } from "../../shared/math";
import type { ProfileExtents, ProfileSnapshot, ProfileState, SmoothPoint, StationPoint } from "./model";

const smoothSamples = 320;
export const PROFILE_RADIUS_FACTOR = 0.972;

export function radiusAt(x: number, length: number, diameter: number): number {
  const t = x / length;
  const body = t * (1 - t) * (1 - 0.5 * t);
  return PROFILE_RADIUS_FACTOR * diameter * Math.sqrt(Math.max(0, body));
}

export function makeStationPoints(length: number, diameter: number, stations: number): StationPoint[] {
  const step = length / stations;
  const halfStep = step / 2;
  const xs = [0, halfStep];

  for (let index = 1; index < stations; index += 1) {
    xs.push(index * step);
  }

  xs.push(length - halfStep, length);

  return uniqueSorted(xs).map((x) => {
    const y = radiusAt(x, length, diameter);
    return { x, yTop: y, yBottom: -y };
  });
}

export function makeSmoothPoints(length: number, diameter: number): SmoothPoint[] {
  const points: SmoothPoint[] = [];
  for (let index = 0; index <= smoothSamples; index += 1) {
    const x = (length * index) / smoothSamples;
    points.push({ x, y: radiusAt(x, length, diameter) });
  }
  return points;
}

export function getExtents(points: readonly SmoothPoint[]): ProfileExtents {
  const maxPoint = points.reduce<SmoothPoint>(
    (best, point) => (point.y > best.y ? point : best),
    { x: 0, y: 0 },
  );

  return {
    maxRadius: maxPoint.y,
    maxHeight: maxPoint.y * 2,
    maxX: maxPoint.x,
  };
}

export function makeProfileSnapshot(state: ProfileState): ProfileSnapshot {
  const smoothPoints = makeSmoothPoints(state.length, state.diameter);
  const stationPoints = makeStationPoints(state.length, state.diameter, state.stations);
  const extents = getExtents(smoothPoints);

  return Object.freeze({
    state: Object.freeze({ ...state }),
    smoothPoints: Object.freeze(smoothPoints),
    stationPoints: Object.freeze(stationPoints),
    extents: Object.freeze(extents),
  });
}
