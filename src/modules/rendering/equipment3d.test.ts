import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { evaluateEquipmentConstraints } from "../equipment/constraints";
import type { EquipmentItem } from "../equipment/model";
import { makeProfileSnapshot } from "../geometry/profile";
import { equipmentSceneTransform, equipmentSignature } from "./equipment3d";

const sphere: EquipmentItem = {
  id: "s1",
  name: "Sphere",
  shape: "sphere",
  massKg: 2,
  position: { x: 4, y: 0.5, z: -0.25 },
  orientation: "x",
  dimensions: { radius: 0.3 },
};

describe("equipment 3d helpers", () => {
  it("maps body equipment position to the Three frame", () => {
    const transform = equipmentSceneTransform(sphere);

    expect(transform.position).toEqual({ x: 4, y: 0.25, z: 0.5 });
    expect(transform.rotation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("rotates cylinder geometry to the requested principal axis", () => {
    const cylinder: EquipmentItem = {
      id: "c1",
      name: "Cylinder",
      shape: "cylinder",
      massKg: 1,
      position: { x: 3, y: 0, z: 0 },
      orientation: "x",
      dimensions: { radius: 0.2, length: 1 },
    };

    const expectedByAxis = {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 0, 1),
      z: new THREE.Vector3(0, -1, 0),
    } as const;

    for (const orientation of ["x", "y", "z"] as const) {
      const rotation = equipmentSceneTransform({ ...cylinder, orientation }).rotation;
      const actual = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(rotation.x, rotation.y, rotation.z));
      expect(actual.x).toBeCloseTo(expectedByAxis[orientation].x, 12);
      expect(actual.y).toBeCloseTo(expectedByAxis[orientation].y, 12);
      expect(actual.z).toBeCloseTo(expectedByAxis[orientation].z, 12);
    }
  });

  it("changes signature when dimensions or position changes", () => {
    const moved = { ...sphere, position: { ...sphere.position, x: 5 } };

    expect(equipmentSignature([sphere])).not.toBe(equipmentSignature([moved]));
    expect(equipmentSignature([sphere])).toBe(equipmentSignature([sphere]));
  });

  it("changes signature when constraint status changes", () => {
    const snapshot = makeProfileSnapshot({
      length: 10,
      breadth: 2,
      height: 2,
      slenderness: 5,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 10,
    });
    const inside = { ...sphere, position: { x: 4, y: 0, z: 0 } } satisfies EquipmentItem;
    const outside = { ...inside, position: { x: 4, y: 1.4, z: 0 } } satisfies EquipmentItem;
    const okReport = evaluateEquipmentConstraints(snapshot, [inside]);
    const outsideReport = evaluateEquipmentConstraints(snapshot, [outside]);

    expect(equipmentSignature([inside], okReport)).not.toBe(equipmentSignature([inside], outsideReport));
  });
});
