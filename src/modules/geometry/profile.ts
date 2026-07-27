import { bodyXFromProfileS } from "../../shared/body-coordinates";
import { logger } from "../../shared/logger";
import { uniqueSorted } from "../../shared/math";
import {
  getExtents as getCurrentFormulaExtents,
  makeProfilePointsForSectionDimensions as makeCurrentFormulaProfilePointsForSectionDimensions,
  makeStationPointsForSectionDimensions as makeCurrentFormulaStationPointsForSectionDimensions,
  profileSectionExtentsAt as currentFormulaProfileSectionExtentsAt,
} from "./current-formula";
import { legacyDsnpPaSectionExtentsAt } from "./legacy-dsnp-pa";
import {
  normalizeGeometryMode,
  type GeometryMode,
  type ProfileExtents,
  type ProfilePoint,
  type ProfileSnapshot,
  type ProfileState,
  type SectionExtents,
  type StationPoint,
} from "./model";

export {
  PROFILE_RADIUS_NORMALIZATION,
  getExtents,
  makeProfilePointsForSectionDimensions,
  makeProfilePoints,
  makeStationPointsForSectionDimensions,
  makeStationPoints,
  maxRadiusS,
  profileSectionExtentsAt,
  profileShapeFactorAt,
  profileRadiusAt,
  radiusAt,
  shapeFactorAt,
  totalProfileLength,
} from "./current-formula";

const smoothSamples = 320;

function makeStationSValues(totalLength: number, stations: number): number[] {
  const step = totalLength / stations;
  const halfStep = step / 2;
  const stationSValues = [0, halfStep];

  for (let index = 1; index < stations; index += 1) {
    stationSValues.push(index * step);
  }

  stationSValues.push(totalLength - halfStep, totalLength);

  return uniqueSorted(stationSValues);
}

function makeLegacyDsnpPaSectionExtents(state: ProfileState, s: number): SectionExtents {
  return legacyDsnpPaSectionExtentsAt({
    s,
    length: state.length,
    maxBreadth: state.breadth,
    maxHeight: state.height,
    cylindricalInsertLength: state.cylindricalInsertLength,
  });
}

export function sectionExtentsAt(state: ProfileState, s: number): SectionExtents {
  if (normalizeGeometryMode(state.geometryMode) === "legacy-dsnp-pa") return makeLegacyDsnpPaSectionExtents(state, s);

  return currentFormulaProfileSectionExtentsAt(
    s,
    state.length,
    state.breadth,
    state.height,
    state.cylindricalInsertLength,
  );
}

function makeLegacyDsnpPaProfilePoints(state: ProfileState): ProfilePoint[] {
  const points: ProfilePoint[] = [];

  for (let index = 0; index <= smoothSamples; index += 1) {
    const s = (state.length * index) / smoothSamples;
    points.push({ s, ...sectionExtentsAt(state, s) });
  }

  return points;
}

function makeLegacyDsnpPaStationPoints(state: ProfileState): StationPoint[] {
  return makeStationSValues(state.length, state.stations).map((s) => {
    const sectionExtents = sectionExtentsAt(state, s);
    return {
      s,
      ...sectionExtents,
      topRadius: sectionExtents.halfHeightZ,
      bottomRadius: -sectionExtents.halfHeightZ,
    };
  });
}

function getLegacyDsnpPaExtents(points: readonly ProfilePoint[]): ProfileExtents {
  const maxPoint = points.reduce<ProfilePoint>(
    (best, point) => (point.radius > best.radius ? point : best),
    { s: 0, radius: 0, halfBreadthY: 0, halfHeightZ: 0 },
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

function makeModeAwareProfileData(
  state: ProfileState,
  geometryMode: GeometryMode,
): Pick<ProfileSnapshot, "smoothPoints" | "stationPoints" | "extents"> {
  if (geometryMode === "legacy-dsnp-pa") {
    const smoothPoints = makeLegacyDsnpPaProfilePoints(state);
    return {
      smoothPoints,
      stationPoints: makeLegacyDsnpPaStationPoints(state),
      extents: getLegacyDsnpPaExtents(smoothPoints),
    };
  }

  const smoothPoints = makeCurrentFormulaProfilePointsForSectionDimensions(
    state.length,
    state.breadth,
    state.height,
    state.cylindricalInsertLength,
  );
  return {
    smoothPoints,
    stationPoints: makeCurrentFormulaStationPointsForSectionDimensions(
      state.length,
      state.breadth,
      state.height,
      state.stations,
      state.cylindricalInsertLength,
    ),
    extents: getCurrentFormulaExtents(smoothPoints),
  };
}

export function makeProfileSnapshot(state: ProfileState): ProfileSnapshot {
  const geometryMode = normalizeGeometryMode(state.geometryMode);
  const { smoothPoints, stationPoints, extents } = makeModeAwareProfileData(state, geometryMode);
  const firstS = smoothPoints[0]?.s ?? 0;
  const lastS = smoothPoints.at(-1)?.s ?? 0;

  logger.debug("profile snapshot built", {
    geometryMode,
    profileSRange: { min: firstS, max: lastS },
    bodyXExtents: {
      min: bodyXFromProfileS(lastS, state.length),
      max: bodyXFromProfileS(firstS, state.length),
    },
    sectionExtents: {
      maxRadius: extents.maxRadius,
      maxHalfBreadthY: extents.maxHalfBreadthY,
      maxHalfHeightZ: extents.maxHalfHeightZ,
      maxHeight: extents.maxHeight,
    },
    profileDimensions: {
      breadth: state.breadth,
      height: state.height,
    },
    smoothPointCount: smoothPoints.length,
    stationPointCount: stationPoints.length,
  });

  return Object.freeze({
    state: Object.freeze({ ...state, geometryMode }),
    smoothPoints: Object.freeze(smoothPoints),
    stationPoints: Object.freeze(stationPoints),
    extents: Object.freeze(extents),
  });
}
