import { logger } from "../../shared/logger";

export type EquipmentShape = "sphere" | "cylinder" | "box";
export type EquipmentAxis = "x" | "y" | "z";

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SphereDimensions {
  readonly radius: number;
}

export interface CylinderDimensions {
  readonly radius: number;
  readonly length: number;
}

export interface BoxDimensions {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export interface SphereEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly shape: "sphere";
  readonly massKg: number;
  readonly position: Vector3;
  readonly orientation: EquipmentAxis;
  readonly dimensions: SphereDimensions;
  readonly displacedVolume?: number;
}

export interface CylinderEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly shape: "cylinder";
  readonly massKg: number;
  readonly position: Vector3;
  readonly orientation: EquipmentAxis;
  readonly dimensions: CylinderDimensions;
  readonly displacedVolume?: number;
}

export interface BoxEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly shape: "box";
  readonly massKg: number;
  readonly position: Vector3;
  readonly orientation: EquipmentAxis;
  readonly dimensions: BoxDimensions;
  readonly displacedVolume?: number;
}

export type EquipmentItem = SphereEquipmentItem | CylinderEquipmentItem | BoxEquipmentItem;

export interface EquipmentValidationResult {
  readonly isValid: boolean;
  readonly reason?: string;
}

export const zeroVector: Vector3 = Object.freeze({ x: 0, y: 0, z: 0 });

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validPosition(position: Vector3): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
}

export function equipmentVolume(item: EquipmentItem): number {
  logger.debug("equipment volume calculation started", { id: item.id, shape: item.shape });
  let volume: number;

  if (item.shape === "sphere") {
    volume = (4 / 3) * Math.PI * item.dimensions.radius ** 3;
  } else if (item.shape === "cylinder") {
    volume = Math.PI * item.dimensions.radius ** 2 * item.dimensions.length;
  } else {
    volume = item.dimensions.width * item.dimensions.height * item.dimensions.depth;
  }

  logger.debug("equipment volume calculation completed", { id: item.id, shape: item.shape, volume });
  return volume;
}

export function equipmentCenter(item: EquipmentItem): Vector3 {
  logger.debug("equipment center resolved", { id: item.id, shape: item.shape, position: item.position });
  return Object.freeze({ ...item.position });
}

export function equipmentDisplacedVolume(item: EquipmentItem): number {
  const displacedVolume = item.displacedVolume ?? equipmentVolume(item);
  logger.debug("equipment displaced volume resolved", {
    id: item.id,
    shape: item.shape,
    displacedVolume,
    usesDefault: item.displacedVolume === undefined,
  });
  return displacedVolume;
}

export function validateEquipmentItem(item: EquipmentItem): EquipmentValidationResult {
  logger.debug("equipment validation started", { id: item.id, shape: item.shape });

  if (!item.id.trim()) {
    logger.warn("equipment validation failed", { id: item.id, shape: item.shape, reason: "id is required" });
    return Object.freeze({ isValid: false, reason: "id is required" });
  }

  if (!item.name.trim()) {
    logger.warn("equipment validation failed", { id: item.id, shape: item.shape, reason: "name is required" });
    return Object.freeze({ isValid: false, reason: "name is required" });
  }

  if (!positiveFinite(item.massKg)) {
    logger.warn("equipment validation failed", { id: item.id, shape: item.shape, reason: "massKg must be positive" });
    return Object.freeze({ isValid: false, reason: "massKg must be positive" });
  }

  if (!validPosition(item.position)) {
    logger.warn("equipment validation failed", { id: item.id, shape: item.shape, reason: "position must be finite" });
    return Object.freeze({ isValid: false, reason: "position must be finite" });
  }

  if (item.displacedVolume !== undefined && !positiveFinite(item.displacedVolume)) {
    logger.warn("equipment validation failed", {
      id: item.id,
      shape: item.shape,
      reason: "displacedVolume must be positive",
    });
    return Object.freeze({ isValid: false, reason: "displacedVolume must be positive" });
  }

  if (item.shape === "sphere" && !positiveFinite(item.dimensions.radius)) {
    logger.warn("equipment validation failed", { id: item.id, shape: item.shape, reason: "radius must be positive" });
    return Object.freeze({ isValid: false, reason: "radius must be positive" });
  }

  if (
    item.shape === "cylinder" &&
    (!positiveFinite(item.dimensions.radius) || !positiveFinite(item.dimensions.length))
  ) {
    logger.warn("equipment validation failed", {
      id: item.id,
      shape: item.shape,
      reason: "cylinder radius and length must be positive",
    });
    return Object.freeze({ isValid: false, reason: "cylinder radius and length must be positive" });
  }

  if (
    item.shape === "box" &&
    (!positiveFinite(item.dimensions.width) ||
      !positiveFinite(item.dimensions.height) ||
      !positiveFinite(item.dimensions.depth))
  ) {
    logger.warn("equipment validation failed", {
      id: item.id,
      shape: item.shape,
      reason: "box dimensions must be positive",
    });
    return Object.freeze({ isValid: false, reason: "box dimensions must be positive" });
  }

  logger.debug("equipment validation completed", { id: item.id, shape: item.shape });
  return Object.freeze({ isValid: true });
}
