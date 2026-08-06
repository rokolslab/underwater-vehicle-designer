import * as THREE from "three";
import type { EquipmentConstraintReport, EquipmentConstraintStatus } from "../equipment/constraints";
import { equipmentStatus } from "../equipment/constraints";
import type { EquipmentItem } from "../equipment/model";
import { logger } from "../../shared/logger";
import { bodyCylinderAxisToThreeEuler, bodyPointToThree } from "./coordinate-adapter";
import { renderingStatusColor } from "./statusColors";

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

export function equipmentSignature(items: readonly EquipmentItem[], report?: EquipmentConstraintReport): string {
  return items
    .map((item) =>
      JSON.stringify({
        id: item.id,
        shape: item.shape,
        massKg: item.massKg,
        position: item.position,
        orientation: item.orientation,
        dimensions: item.dimensions,
        status: equipmentStatus(report, item.id),
      }),
    )
    .join("|");
}

export function equipmentSceneTransform(item: EquipmentItem): EquipmentTransform {
  const rotation = item.shape === "cylinder"
    ? bodyCylinderAxisToThreeEuler(item.orientation)
    : Object.freeze({ x: 0, y: 0, z: 0 });

  const position = bodyPointToThree(item.position);
  logger.debug("3d equipment transform created", {
    id: item.id,
    shape: item.shape,
    sourceFrame: "Body/SNAME-NED",
    targetFrame: "Three.js",
    axisMapping: "three=(body.x,-body.z,body.y)",
    bodyAxis: item.shape === "cylinder" ? item.orientation : null,
  });

  return Object.freeze({
    position,
    rotation: Object.freeze(rotation),
  });
}

export function createEquipmentMaterial(status: EquipmentConstraintStatus): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: renderingStatusColor(status).materialColor,
    metalness: 0.04,
    roughness: 0.36,
    transparent: false,
    opacity: 1,
    depthWrite: true,
  });
}

export function createEquipmentMesh(item: EquipmentItem, material: THREE.Material): THREE.Mesh {
  let geometry: THREE.BufferGeometry;
  if (item.shape === "sphere") {
    geometry = new THREE.SphereGeometry(item.dimensions.radius, 24, 16);
  } else if (item.shape === "cylinder") {
    geometry = new THREE.CylinderGeometry(item.dimensions.radius, item.dimensions.radius, item.dimensions.length, 24);
  } else {
    geometry = new THREE.BoxGeometry(item.dimensions.lengthX, item.dimensions.heightZ, item.dimensions.breadthY);
  }

  const transform = equipmentSceneTransform(item);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `equipment:${item.id}`;
  mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
  mesh.rotation.set(transform.rotation.x, transform.rotation.y, transform.rotation.z);
  return mesh;
}
