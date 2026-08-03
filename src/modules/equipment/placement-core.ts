import { clampNumber } from "../../shared/math";
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

function normalizePositive(value: unknown, fallback: number): number {
  return clampNumber(value, fallback, Number.EPSILON);
}

function normalizeCoordinate(value: unknown, fallback: number): number {
  return clampNumber(value, fallback, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
}

function normalizeVector(position: Partial<BodyPoint3> | undefined, fallback: BodyPoint3): BodyPoint3 {
  return Object.freeze({
    x: normalizeCoordinate(position?.x, fallback.x),
    y: normalizeCoordinate(position?.y, fallback.y),
    z: normalizeCoordinate(position?.z, fallback.z),
  });
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
): EquipmentItem["dimensions"] {
  if (shape === "sphere") {
    return Object.freeze({
      radius: normalizePositive(dimensions?.radius, defaults.radius),
    });
  }

  if (shape === "cylinder") {
    return Object.freeze({
      radius: normalizePositive(dimensions?.radius, defaults.radius),
      length: normalizePositive(dimensions?.length, defaults.length),
    });
  }

  return Object.freeze({
    lengthX: normalizePositive(dimensions?.lengthX, defaults.lengthX),
    breadthY: normalizePositive(dimensions?.breadthY, defaults.breadthY),
    heightZ: normalizePositive(dimensions?.heightZ, defaults.heightZ),
  });
}

function normalizeName(name: string | undefined, fallback: string): string {
  if (name === undefined) return fallback;
  if (!name.trim()) return fallback;
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
  return createItem(id, shape, name);
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
  return Object.freeze([...items, makeDefaultEquipmentItem(id, options)]);
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
        ? normalizeDimensions(shape, update.dimensions)
        : normalizeDimensions(shape, { ...item.dimensions, ...update.dimensions });
    return Object.freeze({
      ...item,
      name: normalizeName(update.name, item.name),
      shape,
      massKg: normalizePositive(update.massKg, item.massKg),
      position: normalizeVector(update.position, item.position),
      orientation: normalizeOrientation(update.orientation, item.orientation),
      dimensions,
      ...(update.displacedVolume === undefined && item.displacedVolume === undefined
        ? {}
        : {
            displacedVolume:
              update.displacedVolume === undefined
                ? item.displacedVolume
                : normalizePositive(update.displacedVolume, item.displacedVolume ?? defaults.massKg),
          }),
    } as EquipmentItem);
  });

  if (!updated) return items;
  return Object.freeze(next);
}

export function renameEquipmentItem(items: readonly EquipmentItem[], id: string, name: string): readonly EquipmentItem[] {
  return updateEquipmentItem(items, id, { name });
}

export function deleteEquipmentItem(items: readonly EquipmentItem[], id: string): readonly EquipmentItem[] {
  const next = items.filter((item) => item.id !== id);
  if (next.length === items.length) return items;
  return Object.freeze(next);
}
