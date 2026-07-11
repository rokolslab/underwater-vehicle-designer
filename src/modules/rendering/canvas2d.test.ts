import { describe, expect, it } from "vitest";
import type { EquipmentItem } from "../equipment/model";
import { equipmentXzProjection } from "./canvas2d";

describe("equipment XZ projection", () => {
  it("uses Body x/z and lengthX/heightZ for a non-cubic box", () => {
    const item: EquipmentItem = {
      id: "box",
      name: "Box",
      shape: "box",
      massKg: 1,
      position: { x: 2, y: 30, z: -4 },
      orientation: "y",
      dimensions: { lengthX: 10, breadthY: 20, heightZ: 6 },
    };

    expect(equipmentXzProjection(item)).toEqual({
      center: { right: 2, down: -4 },
      halfWidth: 5,
      halfHeight: 3,
    });
  });

  it.each([
    ["x", 4, 1],
    ["y", 1, 1],
    ["z", 1, 4],
  ] as const)("matches cylinder %s dimensions in XZ", (orientation, halfWidth, halfHeight) => {
    const item: EquipmentItem = {
      id: `cylinder-${orientation}`,
      name: "Cylinder",
      shape: "cylinder",
      massKg: 1,
      position: { x: 0, y: 0, z: 0 },
      orientation,
      dimensions: { radius: 1, length: 8 },
    };

    expect(equipmentXzProjection(item)).toMatchObject({ halfWidth, halfHeight });
  });
});
