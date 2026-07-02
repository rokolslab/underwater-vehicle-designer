import { clampNumber } from "../../shared/math";
import { logger } from "../../shared/logger";
import type { LongitudinalSectionPlane, Scene3dSection, Scene3dSettings, Scene3dViewMode } from "./model";

export const defaultScene3dSettings: Scene3dSettings = Object.freeze({
  mode: "solid",
  hullOpacity: 0.28,
  section: Object.freeze({ type: "disabled" }),
});

export const minHullOpacity = 0.12;
export const maxHullOpacity = 0.45;

export interface Scene3dSettingsInput {
  readonly mode?: string;
  readonly hullOpacity?: unknown;
  readonly section?: {
    readonly type?: string;
    readonly x?: unknown;
    readonly plane?: string;
    readonly offset?: unknown;
  };
}

export interface Scene3dNormalizationBounds {
  readonly totalLength: number;
  readonly maxRadius: number;
}

function normalizeMode(mode: string | undefined): Scene3dViewMode {
  if (mode === "x-ray" || mode === "cutaway" || mode === "solid") return mode;
  if (mode !== undefined) logger.warn("3d view mode normalized", { requested: mode, normalized: "solid" });
  return "solid";
}

function normalizeOpacity(value: unknown, mode: Scene3dViewMode): number {
  const fallback = defaultScene3dSettings.hullOpacity;
  const normalized = clampNumber(value, fallback, minHullOpacity, maxHullOpacity);
  const numeric = Number(value);
  if (mode !== "solid" && value !== undefined && (!Number.isFinite(numeric) || numeric !== normalized)) {
    logger.warn("3d hull opacity clamped", { mode, requested: value, normalized });
  }
  return normalized;
}

function normalizePlane(plane: string | undefined): LongitudinalSectionPlane {
  if (plane === "xy" || plane === "xz") return plane;
  if (plane !== undefined) logger.warn("3d longitudinal section plane normalized", { requested: plane, normalized: "xy" });
  return "xy";
}

function normalizeSection(input: Scene3dSettingsInput["section"], bounds: Scene3dNormalizationBounds): Scene3dSection {
  if (input?.type === "crossSectionX") {
    const normalized = clampNumber(input.x, bounds.totalLength / 2, 0, bounds.totalLength);
    const numeric = Number(input.x);
    if (input.x !== undefined && (!Number.isFinite(numeric) || numeric !== normalized)) {
      logger.warn("3d cross section position clamped", { requested: input.x, normalized, totalLength: bounds.totalLength });
    }
    return Object.freeze({ type: "crossSectionX", x: normalized });
  }

  if (input?.type === "longitudinalPlane") {
    const normalized = clampNumber(input.offset, 0, -bounds.maxRadius, bounds.maxRadius);
    const numeric = Number(input.offset);
    if (input.offset !== undefined && (!Number.isFinite(numeric) || numeric !== normalized)) {
      logger.warn("3d longitudinal section offset clamped", {
        requested: input.offset,
        normalized,
        maxRadius: bounds.maxRadius,
      });
    }
    return Object.freeze({ type: "longitudinalPlane", plane: normalizePlane(input.plane), offset: normalized });
  }

  if (input?.type !== undefined && input.type !== "disabled") {
    logger.warn("3d section type normalized", { requested: input.type, normalized: "disabled" });
  }
  return Object.freeze({ type: "disabled" });
}

export function normalizeScene3dSettings(
  input: Scene3dSettingsInput,
  bounds: Scene3dNormalizationBounds,
): Scene3dSettings {
  logger.debug("3d scene settings normalization started", { input, bounds });
  const mode = normalizeMode(input.mode);
  const settings = Object.freeze({
    mode,
    hullOpacity: normalizeOpacity(input.hullOpacity, mode),
    section: normalizeSection(input.section, bounds),
  });
  logger.debug("3d scene settings normalization completed", { mode, settings });
  return settings;
}
