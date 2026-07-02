import * as THREE from "three";
import type { EquipmentItem } from "../equipment/model";

export interface EquipmentTransform {
  readonly position: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly rotation: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
}

export function equipmentSignature(items: readonly EquipmentItem[]): string {
  return items
    .map((item) =>
      JSON.stringify({
        id: item.id,
        shape: item.shape,
        massKg: item.massKg,
        position: item.position,
        orientation: item.orientation,
        dimensions: item.dimensions,
      }),
    )
    .join("|");
}

export function equipmentSceneTransform(item: EquipmentItem, totalLength: number): EquipmentTransform {
  const rotation = { x: 0, y: 0, z: 0 };
  if (item.shape === "cylinder") {
    if (item.orientation === "x") rotation.z = Math.PI / 2;
    if (item.orientation === "z") rotation.x = Math.PI / 2;
  }

  return Object.freeze({
    position: Object.freeze({
      x: item.position.x - totalLength / 2,
      y: item.position.y,
      z: item.position.z,
    }),
    rotation: Object.freeze(rotation),
  });
}

export function createEquipmentMesh(item: EquipmentItem, totalLength: number, material: THREE.Material): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  if (item.shape === "sphere") {
    geometry = new THREE.SphereGeometry(item.dimensions.radius, 24, 16);
  } else if (item.shape === "cylinder") {
    geometry = new THREE.CylinderGeometry(item.dimensions.radius, item.dimensions.radius, item.dimensions.length, 24);
  } else {
    geometry = new THREE.BoxGeometry(item.dimensions.width, item.dimensions.height, item.dimensions.depth);
  }

  const transform = equipmentSceneTransform(item, totalLength);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `equipment:${item.id}`;
  mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
  mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  return mesh;
}
