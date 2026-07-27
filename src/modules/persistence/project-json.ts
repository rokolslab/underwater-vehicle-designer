import { DEFAULT_GRAVITY_M_PER_S2, DEFAULT_WATER_DENSITY_KG_PER_M3 } from "../balance/equipment-balance";
import type { BalanceSettings } from "../balance/model";
import type { BodyPoint3 } from "../../shared/body-coordinates";
import type { EquipmentAxis, EquipmentItem, EquipmentShape } from "../equipment/model";
import { createDefaultEquipmentItem, updateEquipmentItem, type EquipmentUpdate } from "../equipment/placement";
import { defaultGeometryMode, normalizeGeometryMode, type ProfileState } from "../geometry/model";
import type { Scene3dSettings } from "../rendering/model";
import { defaultScene3dSettings, normalizeScene3dSettings } from "../rendering/viewSettings";
import { logger } from "../../shared/logger";
import { clampNumber } from "../../shared/math";
import { migrateProjectV1ToV2 } from "./project-json-migrations";

export const projectJsonSchemaVersion = 2;
export const projectJsonCoordinateSystem = "SNAME_NED_BODY_CENTER_V1" as const;

export interface SerializableProjectState {
  readonly profile: ProfileState;
  readonly equipment: readonly EquipmentItem[];
  readonly scene3dSettings: Scene3dSettings;
  readonly balanceSettings: BalanceSettings;
}

export interface ProjectJsonDocument {
  readonly schemaVersion: typeof projectJsonSchemaVersion;
  readonly coordinateSystem: typeof projectJsonCoordinateSystem;
  readonly exportedAt: string;
  readonly project: SerializableProjectState;
}

export type ProjectJsonParseResult =
  | {
      readonly ok: true;
      readonly project: SerializableProjectState;
      readonly warnings: readonly string[];
      readonly migratedFromVersion?: 1;
    }
  | { readonly ok: false; readonly error: string; readonly warnings: readonly string[] };

const defaultProfile: ProfileState = Object.freeze({
  geometryMode: defaultGeometryMode,
  length: 6,
  slenderness: 3,
  diameter: 2,
  cylindricalInsertLength: 0,
  stations: 20,
  showGrid: true,
  showPoints: true,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, warnings: string[], path: string): Record<string, unknown> {
  if (isRecord(value)) return value;
  warnings.push(`${path} is not an object; defaults used`);
  logger.warn("project json object normalized", { path });
  return {};
}

function readNumber(value: unknown, fallback: number, min: number, max: number, warnings: string[], path: string): number {
  const normalized = clampNumber(value, fallback, min, max);
  const numeric = Number(value);
  if (value !== undefined && (!Number.isFinite(numeric) || numeric !== normalized)) {
    warnings.push(`${path} normalized`);
    logger.warn("project json number normalized", { path, requested: value, normalized });
  }
  return normalized;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function readGeometryMode(value: unknown, warnings: string[]): ProfileState["geometryMode"] {
  const normalized = normalizeGeometryMode(value);
  if (value !== undefined && value !== normalized) {
    warnings.push("project.profile.geometryMode normalized");
    logger.warn("project json geometry mode normalized", { requested: value, normalized });
  }
  return normalized;
}

function normalizeProfile(value: unknown, warnings: string[]): ProfileState {
  const source = readRecord(value, warnings, "project.profile");
  const length = readNumber(source.length, defaultProfile.length, 0.1, Number.POSITIVE_INFINITY, warnings, "project.profile.length");
  const slenderness = readNumber(source.slenderness, defaultProfile.slenderness, 0.1, Number.POSITIVE_INFINITY, warnings, "project.profile.slenderness");
  const cylindricalInsertLength = readNumber(
    source.cylindricalInsertLength,
    defaultProfile.cylindricalInsertLength,
    0,
    length / 2,
    warnings,
    "project.profile.cylindricalInsertLength",
  );
  const stations = Math.round(readNumber(source.stations, defaultProfile.stations, 8, 80, warnings, "project.profile.stations"));

  return Object.freeze({
    geometryMode: readGeometryMode(source.geometryMode, warnings),
    length,
    slenderness,
    diameter: length / slenderness,
    cylindricalInsertLength,
    stations,
    showGrid: readBoolean(source.showGrid, defaultProfile.showGrid),
    showPoints: readBoolean(source.showPoints, defaultProfile.showPoints),
  });
}

function normalizeShape(value: unknown, warnings: string[], id: string): EquipmentShape {
  if (value === "sphere" || value === "cylinder" || value === "box") return value;
  if (value !== undefined) {
    warnings.push(`equipment ${id} shape normalized`);
    logger.warn("project json equipment shape normalized", { id, requested: value, normalized: "sphere" });
  }
  return "sphere";
}

function normalizeAxis(value: unknown, warnings: string[], id: string): EquipmentAxis {
  if (value === "x" || value === "y" || value === "z") return value;
  if (value !== undefined) {
    warnings.push(`equipment ${id} orientation normalized`);
    logger.warn("project json equipment orientation normalized", { id, requested: value, normalized: "x" });
  }
  return "x";
}

function normalizeVector(value: unknown, warnings: string[], id: string): Partial<BodyPoint3> {
  const source = readRecord(value, warnings, `equipment ${id} position`);
  return Object.freeze({
    x: readNumber(source.x, 0, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, warnings, `equipment ${id} position.x`),
    y: readNumber(source.y, 0, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, warnings, `equipment ${id} position.y`),
    z: readNumber(source.z, 0, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, warnings, `equipment ${id} position.z`),
  });
}

function normalizeDimensions(value: unknown, warnings: string[], id: string): EquipmentUpdate["dimensions"] {
  const source = readRecord(value, warnings, `equipment ${id} dimensions`);
  return Object.freeze({
    radius: readNumber(source.radius, 0.2, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} dimensions.radius`),
    length: readNumber(source.length, 0.5, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} dimensions.length`),
    lengthX: readNumber(source.lengthX, 0.4, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} dimensions.lengthX`),
    breadthY: readNumber(source.breadthY, 0.4, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} dimensions.breadthY`),
    heightZ: readNumber(source.heightZ, 0.4, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} dimensions.heightZ`),
  });
}

function normalizeEquipment(value: unknown, warnings: string[]): readonly EquipmentItem[] {
  if (!Array.isArray(value)) {
    if (value !== undefined) {
      warnings.push("project.equipment is not an array; empty list used");
      logger.warn("project json equipment list normalized", { requestedType: typeof value });
    }
    return Object.freeze([]);
  }

  const usedIds = new Set<string>();
  const items = value.map((entry, index) => {
    const source = readRecord(entry, warnings, `project.equipment[${index}]`);
    const requestedId = readString(source.id, `equipment-${index + 1}`);
    const id = usedIds.has(requestedId) ? `${requestedId}-${index + 1}` : requestedId;
    if (id !== requestedId) {
      warnings.push(`equipment ${requestedId} duplicate id normalized`);
      logger.warn("project json equipment duplicate id normalized", { requestedId, normalized: id });
    }
    usedIds.add(id);

    const shape = normalizeShape(source.shape, warnings, id);
    const base = createDefaultEquipmentItem({ idFactory: () => id, shape, name: readString(source.name, "Оборудование") });
    const displacedVolume = source.displacedVolume === undefined
      ? undefined
      : readNumber(source.displacedVolume, 1, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} displacedVolume`);

    const [normalized] = updateEquipmentItem([base], id, {
      name: readString(source.name, base.name),
      shape,
      massKg: readNumber(source.massKg, base.massKg, Number.EPSILON, Number.POSITIVE_INFINITY, warnings, `equipment ${id} massKg`),
      position: normalizeVector(source.position, warnings, id),
      orientation: normalizeAxis(source.orientation, warnings, id),
      dimensions: normalizeDimensions(source.dimensions, warnings, id),
      displacedVolume,
    });
    return normalized;
  });

  return Object.freeze(items);
}

function normalizeBalanceSettings(value: unknown, warnings: string[]): BalanceSettings {
  const source = readRecord(value, warnings, "project.balanceSettings");
  return Object.freeze({
    waterDensityKgPerM3: readNumber(
      source.waterDensityKgPerM3,
      DEFAULT_WATER_DENSITY_KG_PER_M3,
      Number.EPSILON,
      Number.POSITIVE_INFINITY,
      warnings,
      "project.balanceSettings.waterDensityKgPerM3",
    ),
    gravityMPerS2: readNumber(
      source.gravityMPerS2,
      DEFAULT_GRAVITY_M_PER_S2,
      Number.EPSILON,
      Number.POSITIVE_INFINITY,
      warnings,
      "project.balanceSettings.gravityMPerS2",
    ),
  });
}

function normalizeSceneSettings(value: unknown, profile: ProfileState): Scene3dSettings {
  return normalizeScene3dSettings(isRecord(value) ? value : defaultScene3dSettings, {
    totalLength: profile.length,
    maxRadius: profile.diameter / 2,
  });
}

function normalizeProject(value: unknown, warnings: string[]): SerializableProjectState {
  const source = readRecord(value, warnings, "project");
  const profile = normalizeProfile(source.profile, warnings);
  return Object.freeze({
    profile,
    equipment: normalizeEquipment(source.equipment, warnings),
    scene3dSettings: normalizeSceneSettings(source.scene3dSettings, profile),
    balanceSettings: normalizeBalanceSettings(source.balanceSettings, warnings),
  });
}

export function buildProjectJson(project: SerializableProjectState): string {
  logger.debug("project json export started", {
    equipmentCount: project.equipment.length,
    scene3dMode: project.scene3dSettings.mode,
  });
  const normalizedProject = Object.freeze({
    ...project,
    profile: Object.freeze({
      ...project.profile,
      geometryMode: normalizeGeometryMode(project.profile.geometryMode),
    }),
  });
  const document: ProjectJsonDocument = Object.freeze({
    schemaVersion: projectJsonSchemaVersion,
    coordinateSystem: projectJsonCoordinateSystem,
    exportedAt: new Date().toISOString(),
    project: normalizedProject,
  });
  const json = JSON.stringify(document, null, 2);
  logger.debug("project json export completed", { bytes: json.length, equipmentCount: project.equipment.length });
  return json;
}

export function parseProjectJson(json: string): ProjectJsonParseResult {
  logger.debug("project json import parse started", { bytes: json.length });
  const warnings: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    logger.warn("project json import failed", { reason: "invalidJson", error: error instanceof Error ? error.message : String(error) });
    return Object.freeze({ ok: false, error: "Некорректный JSON-файл проекта.", warnings });
  }

  if (!isRecord(parsed)) {
    logger.warn("project json import failed", { reason: "rootNotObject" });
    return Object.freeze({ ok: false, error: "Файл проекта должен содержать JSON-объект.", warnings });
  }

  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== projectJsonSchemaVersion) {
    logger.warn("project json import failed", { reason: "unsupportedVersion", requested: parsed.schemaVersion });
    return Object.freeze({ ok: false, error: "Версия JSON-проекта не поддерживается.", warnings });
  }

  if (!isRecord(parsed.project)) {
    logger.warn("project json import failed", { reason: "missingProject" });
    return Object.freeze({ ok: false, error: "В файле проекта отсутствует секция project.", warnings });
  }

  if (parsed.schemaVersion === projectJsonSchemaVersion && parsed.coordinateSystem !== projectJsonCoordinateSystem) {
    logger.warn("project json import failed", { reason: "invalidCoordinateSystem", schemaVersion: parsed.schemaVersion });
    return Object.freeze({
      ok: false,
      error: "JSON-проект v2 содержит неизвестную или отсутствующую систему координат.",
      warnings,
    });
  }

  try {
    let projectSource: Record<string, unknown> = parsed.project;
    let migratedFromVersion: 1 | undefined;
    if (parsed.schemaVersion === 1) {
      const normalizedProfile = normalizeProfile(projectSource.profile, warnings);
      projectSource = migrateProjectV1ToV2(projectSource, normalizedProfile);
      migratedFromVersion = 1;
      warnings.push("Проект v1 преобразован в SNAME/NED: старая ось z принята направленной на правый борт (body +Y). Проверьте размещение по бортам.");
      logger.info("project json schema migration completed", { fromVersion: 1, toVersion: projectJsonSchemaVersion });
      logger.warn("project json migration assumption applied", {
        fromVersion: 1,
        toVersion: projectJsonSchemaVersion,
        assumption: "old.z=starboard",
      });
    }

    const project = normalizeProject(projectSource, warnings);
    logger.debug("project json import parse completed", {
      schemaVersion: parsed.schemaVersion,
      migratedFromVersion,
      equipmentCount: project.equipment.length,
      warningCount: warnings.length,
    });
    return Object.freeze({
      ok: true,
      project,
      warnings: Object.freeze(warnings),
      ...(migratedFromVersion === undefined ? {} : { migratedFromVersion }),
    });
  } catch (error) {
    logger.error("project json import failed unexpectedly", {
      schemaVersion: parsed.schemaVersion,
      error: error instanceof Error ? error.message : String(error),
    });
    return Object.freeze({ ok: false, error: "Не удалось обработать JSON-проект.", warnings: Object.freeze(warnings) });
  }
}
