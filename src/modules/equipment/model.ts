import type { BodyPoint3 } from "../../shared/body-coordinates";

export type EquipmentShape = "sphere" | "cylinder" | "box";
export type EquipmentAxis = "x" | "y" | "z";

export interface SphereDimensions {
  readonly radius: number;
}

export interface CylinderDimensions {
  readonly radius: number;
  readonly length: number;
}

export interface BoxDimensions {
  readonly lengthX: number;
  readonly breadthY: number;
  readonly heightZ: number;
}

export interface SphereEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly shape: "sphere";
  readonly massKg: number;
  readonly position: BodyPoint3;
  readonly orientation: EquipmentAxis;
  readonly dimensions: SphereDimensions;
  readonly displacedVolume?: number;
}

export interface CylinderEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly shape: "cylinder";
  readonly massKg: number;
  readonly position: BodyPoint3;
  readonly orientation: EquipmentAxis;
  readonly dimensions: CylinderDimensions;
  readonly displacedVolume?: number;
}

export interface BoxEquipmentItem {
  readonly id: string;
  readonly name: string;
  readonly shape: "box";
  readonly massKg: number;
  readonly position: BodyPoint3;
  readonly orientation: EquipmentAxis;
  readonly dimensions: BoxDimensions;
  readonly displacedVolume?: number;
}

export type EquipmentItem = SphereEquipmentItem | CylinderEquipmentItem | BoxEquipmentItem;

export interface EquipmentValidationResult {
  readonly isValid: boolean;
  readonly reason?: string;
}

export const zeroVector: BodyPoint3 = Object.freeze({ x: 0, y: 0, z: 0 });

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function validPosition(position: BodyPoint3): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);
}

export function equipmentVolume(item: EquipmentItem): number {
  if (item.shape === "sphere") {
    return (4 / 3) * Math.PI * item.dimensions.radius ** 3;
  }

  if (item.shape === "cylinder") {
    return Math.PI * item.dimensions.radius ** 2 * item.dimensions.length;
  }

  return item.dimensions.lengthX * item.dimensions.breadthY * item.dimensions.heightZ;
}

export function equipmentCenter(item: EquipmentItem): BodyPoint3 {
  return Object.freeze({ ...item.position });
}

export function equipmentDisplacedVolume(item: EquipmentItem): number {
  return item.displacedVolume ?? equipmentVolume(item);
}

export function validateEquipmentItem(item: EquipmentItem): EquipmentValidationResult {
  if (!item.id.trim()) {
    return Object.freeze({ isValid: false, reason: "id is required" });
  }

  if (!item.name.trim()) {
    return Object.freeze({ isValid: false, reason: "name is required" });
  }

  if (!positiveFinite(item.massKg)) {
    return Object.freeze({ isValid: false, reason: "massKg must be positive" });
  }

  if (!validPosition(item.position)) {
    return Object.freeze({ isValid: false, reason: "position must be finite" });
  }

  if (item.displacedVolume !== undefined && !positiveFinite(item.displacedVolume)) {
    return Object.freeze({ isValid: false, reason: "displacedVolume must be positive" });
  }

  if (item.shape === "sphere" && !positiveFinite(item.dimensions.radius)) {
    return Object.freeze({ isValid: false, reason: "radius must be positive" });
  }

  if (
    item.shape === "cylinder" &&
    (!positiveFinite(item.dimensions.radius) || !positiveFinite(item.dimensions.length))
  ) {
    return Object.freeze({ isValid: false, reason: "cylinder radius and length must be positive" });
  }

  if (
    item.shape === "box" &&
    (!positiveFinite(item.dimensions.lengthX) ||
      !positiveFinite(item.dimensions.breadthY) ||
      !positiveFinite(item.dimensions.heightZ))
  ) {
    return Object.freeze({ isValid: false, reason: "box dimensions must be positive" });
  }

  return Object.freeze({ isValid: true });
}
