import { normalizeGeometryMode } from "../../modules/geometry/model";
import type { GeometryMode, GeometryProfileState, ProfileState } from "../../modules/geometry/model";
import { clampNumber } from "../../shared/math";
import { DEFAULT_PROJECT_PROFILE_INPUTS } from "./defaults";
import type { ProjectProfileInputs } from "./model";

export type ProfileNormalizationPolicy = "interactive-height" | "interactive-slenderness" | "persisted-profile";

export interface RawProjectProfileInput {
  readonly geometryMode?: unknown;
  readonly length?: unknown;
  readonly breadth?: unknown;
  readonly height?: unknown;
  readonly diameter?: unknown;
  readonly slenderness?: unknown;
  readonly cylindricalInsertLength?: unknown;
  readonly stations?: unknown;
}

export interface NormalizationNotice {
  readonly field: keyof RawProjectProfileInput;
  readonly reason: "invalid" | "clamped" | "unsupported";
  readonly requested: unknown;
  readonly normalized: number | GeometryMode;
  readonly supplied: boolean;
}

export interface NormalizedProjectProfileResult {
  readonly profile: ProjectProfileInputs;
  readonly slenderness: number;
  readonly notices: readonly NormalizationNotice[];
}

export interface ProfileViewFlags {
  readonly showGrid: boolean;
  readonly showPoints: boolean;
}

function notice(
  notices: NormalizationNotice[],
  field: keyof RawProjectProfileInput,
  reason: NormalizationNotice["reason"],
  requested: unknown,
  normalized: number | GeometryMode,
): void {
  notices.push(Object.freeze({ field, reason, requested, normalized, supplied: requested !== undefined }));
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
  field: keyof RawProjectProfileInput,
  notices: NormalizationNotice[],
): number {
  const normalized = clampNumber(value, fallback, min, max);
  const numeric = Number(value);
  if (value !== undefined && (!Number.isFinite(numeric) || numeric !== normalized)) {
    notice(notices, field, Number.isFinite(numeric) ? "clamped" : "invalid", value, normalized);
  }
  return normalized;
}

function normalizeMode(value: unknown, notices: NormalizationNotice[]): GeometryMode {
  const normalized = normalizeGeometryMode(value);
  if (value !== undefined && value !== normalized) {
    notice(notices, "geometryMode", "unsupported", value, normalized);
  }
  return normalized;
}

export function normalizeProjectProfileInputs(
  raw: RawProjectProfileInput,
  policy: ProfileNormalizationPolicy,
): NormalizedProjectProfileResult {
  const notices: NormalizationNotice[] = [];
  const length = normalizeNumber(raw.length, DEFAULT_PROJECT_PROFILE_INPUTS.length, 0.1, Number.POSITIVE_INFINITY, "length", notices);
  const sourceSlenderness = normalizeNumber(
    raw.slenderness,
    DEFAULT_PROJECT_PROFILE_INPUTS.length / DEFAULT_PROJECT_PROFILE_INPUTS.height,
    0.1,
    Number.POSITIVE_INFINITY,
    "slenderness",
    notices,
  );

  let height: number;
  let slenderness: number;
  if (policy === "interactive-slenderness") {
    slenderness = sourceSlenderness;
    height = length / slenderness;
  } else if (policy === "interactive-height") {
    height = normalizeNumber(raw.height, length / sourceSlenderness, 0.01, Number.POSITIVE_INFINITY, "height", notices);
    slenderness = length / height;
  } else {
    const hasHeight = raw.height !== undefined;
    const heightField = hasHeight ? "height" : "diameter";
    const heightSource = hasHeight ? raw.height : raw.diameter;
    height = normalizeNumber(heightSource, length / sourceSlenderness, 0.01, Number.POSITIVE_INFINITY, heightField, notices);
    slenderness = length / height;
  }

  const breadthFallback = policy === "persisted-profile" ? height : DEFAULT_PROJECT_PROFILE_INPUTS.breadth;
  const breadth = normalizeNumber(raw.breadth, breadthFallback, 0.01, Number.POSITIVE_INFINITY, "breadth", notices);
  const cylindricalInsertLength = normalizeNumber(
    raw.cylindricalInsertLength,
    DEFAULT_PROJECT_PROFILE_INPUTS.cylindricalInsertLength,
    0,
    length / 2,
    "cylindricalInsertLength",
    notices,
  );
  const stations = Math.round(
    normalizeNumber(raw.stations, DEFAULT_PROJECT_PROFILE_INPUTS.stations, 8, 80, "stations", notices),
  );

  return Object.freeze({
    profile: Object.freeze({
      geometryMode: normalizeMode(raw.geometryMode, notices),
      length,
      breadth,
      height,
      cylindricalInsertLength,
      stations,
    }),
    slenderness,
    notices: Object.freeze([...notices]),
  });
}

export function projectProfileInputsToProfileState(
  result: NormalizedProjectProfileResult,
  viewFlags: ProfileViewFlags,
): ProfileState {
  return projectProfileInputsWithViewToProfileState(result.profile, viewFlags);
}

export function projectProfileInputsToGeometryProfileState(profile: ProjectProfileInputs): GeometryProfileState {
  return Object.freeze({
    ...profile,
    slenderness: profile.length / profile.height,
    diameter: profile.height,
  });
}

export function projectProfileInputsWithViewToProfileState(
  profile: ProjectProfileInputs,
  viewFlags: ProfileViewFlags,
): ProfileState {
  return Object.freeze({
    ...projectProfileInputsToGeometryProfileState(profile),
    showGrid: viewFlags.showGrid,
    showPoints: viewFlags.showPoints,
  });
}
