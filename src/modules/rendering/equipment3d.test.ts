import { describe, expect, it } from "vitest";
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
  it("translates equipment x from nose coordinates to centered scene coordinates", () => {
    const transform = equipmentSceneTransform(sphere, 6);

    expect(transform.position).toEqual({ x: 1, y: 0.5, z: -0.25 });
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

    expect(equipmentSceneTransform(cylinder, 6).rotation.z).toBeCloseTo(Math.PI / 2, 12);
    expect(equipmentSceneTransform({ ...cylinder, orientation: "z" }, 6).rotation.x).toBeCloseTo(Math.PI / 2, 12);
    expect(equipmentSceneTransform({ ...cylinder, orientation: "y" }, 6).rotation).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("changes signature when dimensions or position changes", () => {
    const moved = { ...sphere, position: { ...sphere.position, x: 5 } };

    expect(equipmentSignature([sphere])).not.toBe(equipmentSignature([moved]));
    expect(equipmentSignature([sphere])).toBe(equipmentSignature([sphere]));
  });

  it("changes signature when constraint status changes", () => {
    const snapshot = makeProfileSnapshot({
      length: 10,
      slenderness: 5,
      diameter: 2,
      cylindricalInsertLength: 0,
      stations: 10,
      showGrid: true,
      showPoints: true,
    });
    const inside = { ...sphere, position: { x: 4, y: 0, z: 0 } } satisfies EquipmentItem;
    const outside = { ...inside, position: { x: 4, y: 1.4, z: 0 } } satisfies EquipmentItem;
    const okReport = evaluateEquipmentConstraints(snapshot, [inside]);
    const outsideReport = evaluateEquipmentConstraints(snapshot, [outside]);

    expect(equipmentSignature([inside], okReport)).not.toBe(equipmentSignature([inside], outsideReport));
  });
});
