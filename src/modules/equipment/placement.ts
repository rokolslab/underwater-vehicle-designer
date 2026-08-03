import { clampNumber } from "../../shared/math";
import { logger } from "../../shared/logger";
import type { BodyPoint3 } from "../../shared/body-coordinates";
import type { BoxDimensions, CylinderDimensions, EquipmentAxis, EquipmentItem, EquipmentShape, SphereDimensions } from "./model";

export type EquipmentIdFactory = () => string;

export interface CreateEquipmentOptions {
  readonly idFactory?: EquipmentIdFactory;
  readonly shape?: EquipmentShape;
  readonly name?: string;
}

export type EquipmentUpdate = Partial<{
  readonly name: string;
  readonly shape: EquipmentShape;
  readonly massKg: number;
  readonly position: Partial<BodyPoint3>;
  readonly orientation: EquipmentAxis;
  readonly dimensions: Partial<BoxDimensions & CylinderDimensions>;
  readonly displacedVolume: number | undefined;
}>;

const defaults = {
  massKg: 1,
  radius: 0.2,
  length: 0.5,
  lengthX: 0.4,
  breadthY: 0.4,
  heightZ: 0.4,
};

function allocateDefaultEquipmentId(occupiedIds: ReadonlySet<string>): string {
  let suffix = 1;
  while (occupiedIds.has(`equipment-${suffix}`)) suffix += 1;
  return `equipment-${suffix}`;
}

export function allocateUniqueEquipmentId(
  requestedId: string | undefined,
  occupiedIds: ReadonlySet<string>,
  preferredSuffix: number,
): string {
  const normalizedRequestedId = requestedId?.trim() ?? "";
  if (!normalizedRequestedId) return allocateDefaultEquipmentId(occupiedIds);
  if (!occupiedIds.has(normalizedRequestedId)) return normalizedRequestedId;

  let suffix = Math.max(2, Math.floor(preferredSuffix));
  while (occupiedIds.has(`${normalizedRequestedId}-${suffix}`)) suffix += 1;
  return `${normalizedRequestedId}-${suffix}`;
}

function normalizePositive(value: unknown, fallback: number, field: string, id: string): number {
  const normalized = clampNumber(value, fallback, Number.EPSILON);
  const numeric = Number(value);
  if (value !== undefined && (!Number.isFinite(numeric) || numeric <= 0 || normalized !== numeric)) {
    logger.warn("equipment numeric value clamped", { id, field, requested: value, normalized });
  }
  return normalized;
}

function normalizeVector(position: Partial<BodyPoint3> | undefined, fallback: BodyPoint3, id: string): BodyPoint3 {
  return Object.freeze({
    x: normalizeCoordinate(position?.x, fallback.x, "position.x", id),
    y: normalizeCoordinate(position?.y, fallback.y, "position.y", id),
    z: normalizeCoordinate(position?.z, fallback.z, "position.z", id),
  });
}

function normalizeCoordinate(value: unknown, fallback: number, field: string, id: string): number {
  const normalized = clampNumber(value, fallback, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
  if (!Number.isFinite(Number(value)) && value !== undefined) {
    logger.warn("equipment coordinate normalized", { id, field, requested: value, normalized });
  }
  return normalized;
}

function defaultSphereDimensions(): SphereDimensions {
  return Object.freeze({ radius: defaults.radius });
}

function defaultCylinderDimensions(): CylinderDimensions {
  return Object.freeze({ radius: defaults.radius, length: defaults.length });
}

function defaultBoxDimensions(): BoxDimensions {
  return Object.freeze({ lengthX: defaults.lengthX, breadthY: defaults.breadthY, heightZ: defaults.heightZ });
}

function normalizeDimensions(
  shape: EquipmentShape,
  dimensions: EquipmentUpdate["dimensions"] | undefined,
  id: string,
): EquipmentItem["dimensions"] {
  if (shape === "sphere") {
    return Object.freeze({
      radius: normalizePositive(dimensions?.radius, defaults.radius, "radius", id),
    });
  }

  if (shape === "cylinder") {
    return Object.freeze({
      radius: normalizePositive(dimensions?.radius, defaults.radius, "radius", id),
      length: normalizePositive(dimensions?.length, defaults.length, "length", id),
    });
  }

  return Object.freeze({
    lengthX: normalizePositive(dimensions?.lengthX, defaults.lengthX, "lengthX", id),
    breadthY: normalizePositive(dimensions?.breadthY, defaults.breadthY, "breadthY", id),
    heightZ: normalizePositive(dimensions?.heightZ, defaults.heightZ, "heightZ", id),
  });
}

function normalizeName(name: string | undefined, fallback: string): string {
  if (name === undefined) return fallback;
  if (!name.trim()) return fallback;
  if (name !== name.trim()) {
    logger.debug("[FIX] equipment name whitespace preserved during editing", {
      length: name.length,
      trimmedLength: name.trim().length,
    });
  }
  return name;
}

function normalizeOrientation(orientation: EquipmentAxis | undefined, fallback: EquipmentAxis): EquipmentAxis {
  return orientation ?? fallback;
}

function createItem(id: string, shape: EquipmentShape, name: string): EquipmentItem {
  const base = {
    id,
    name,
    massKg: defaults.massKg,
    position: Object.freeze({ x: 0, y: 0, z: 0 }),
    orientation: "x" as EquipmentAxis,
  };

  if (shape === "sphere") return Object.freeze({ ...base, shape, dimensions: defaultSphereDimensions() });
  if (shape === "cylinder") return Object.freeze({ ...base, shape, dimensions: defaultCylinderDimensions() });
  return Object.freeze({ ...base, shape, dimensions: defaultBoxDimensions() });
}

function makeDefaultEquipmentItem(id: string, options: CreateEquipmentOptions = {}): EquipmentItem {
  const shape = options.shape ?? "sphere";
  const name = normalizeName(options.name, "Оборудование");
  const item = createItem(id, shape, name);
  logger.debug("equipment item created", { id, shape, name });
  return item;
}

export function createDefaultEquipmentItem(options: CreateEquipmentOptions = {}): EquipmentItem {
  const id = allocateUniqueEquipmentId(options.idFactory?.(), new Set<string>(), 1);
  return makeDefaultEquipmentItem(id, options);
}

export function addEquipmentItem(
  items: readonly EquipmentItem[],
  options: CreateEquipmentOptions = {},
): readonly EquipmentItem[] {
  const occupiedIds = new Set(items.map((item) => item.id));
  const id = allocateUniqueEquipmentId(options.idFactory?.(), occupiedIds, items.length + 1);
  const item = makeDefaultEquipmentItem(id, options);
  const next = Object.freeze([...items, item]);
  logger.debug("equipment item added", { id: item.id, shape: item.shape, occupiedIdCount: occupiedIds.size, count: next.length });
  return next;
}

export function updateEquipmentItem(
  items: readonly EquipmentItem[],
  id: string,
  update: EquipmentUpdate,
): readonly EquipmentItem[] {
  let updated = false;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    updated = true;
    const shape = update.shape ?? item.shape;
    const dimensions =
      update.shape && update.shape !== item.shape
        ? normalizeDimensions(shape, update.dimensions, id)
        : normalizeDimensions(shape, { ...item.dimensions, ...update.dimensions }, id);
    const nextItem = Object.freeze({
      ...item,
      name: normalizeName(update.name, item.name),
      shape,
      massKg: normalizePositive(update.massKg, item.massKg, "massKg", id),
      position: normalizeVector(update.position, item.position, id),
      orientation: normalizeOrientation(update.orientation, item.orientation),
      dimensions,
      ...(update.displacedVolume === undefined && item.displacedVolume === undefined
        ? {}
        : {
            displacedVolume:
              update.displacedVolume === undefined
                ? item.displacedVolume
                : normalizePositive(
                    update.displacedVolume,
                    item.displacedVolume ?? defaults.massKg,
                    "displacedVolume",
                    id,
                  ),
          }),
    } as EquipmentItem);
    logger.debug("equipment item updated", {
      id,
      shape: nextItem.shape,
      changedFields: Object.keys(update),
    });
    return nextItem;
  });

  if (!updated) {
    logger.warn("equipment update skipped for unknown id", { id, count: items.length });
    return items;
  }

  logger.debug("equipment list updated", { id, count: next.length });
  return Object.freeze(next);
}

export function renameEquipmentItem(items: readonly EquipmentItem[], id: string, name: string): readonly EquipmentItem[] {
  return updateEquipmentItem(items, id, { name });
}

export function deleteEquipmentItem(items: readonly EquipmentItem[], id: string): readonly EquipmentItem[] {
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) {
    logger.warn("equipment delete skipped for unknown id", { id, count: items.length });
    return items;
  }
  logger.debug("equipment item deleted", { id, count: next.length });
  return Object.freeze(next);
}
