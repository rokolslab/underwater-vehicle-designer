import { describe, expect, it, vi } from "vitest";
import type { EquipmentItem } from "./model";
import { equipmentCenter, equipmentDisplacedVolume, equipmentVolume, validateEquipmentItem } from "./model";

const sphere: EquipmentItem = Object.freeze({
  id: "sphere-1",
  name: "Sphere",
  shape: "sphere",
  massKg: 2,
  position: Object.freeze({ x: 1, y: -2, z: 3 }),
  orientation: "x",
  dimensions: Object.freeze({ radius: 0.5 }),
});

const cylinder: EquipmentItem = Object.freeze({
  id: "cylinder-1",
  name: "Cylinder",
  shape: "cylinder",
  massKg: 3,
  position: Object.freeze({ x: 0, y: 0, z: 0 }),
  orientation: "y",
  dimensions: Object.freeze({ radius: 0.5, length: 2 }),
});

const box: EquipmentItem = Object.freeze({
  id: "box-1",
  name: "Box",
  shape: "box",
  massKg: 4,
  position: Object.freeze({ x: -1, y: 2, z: -3 }),
  orientation: "z",
  dimensions: Object.freeze({ lengthX: 2, breadthY: 3, heightZ: 4 }),
});

describe("equipment model", () => {
  it("calculates volume for supported equipment shapes", () => {
    expect(equipmentVolume(sphere)).toBeCloseTo(Math.PI / 6, 12);
    expect(equipmentVolume(cylinder)).toBeCloseTo(Math.PI * 0.5, 12);
    expect(equipmentVolume(box)).toBe(24);
  });

  it("returns a frozen copy of the equipment center", () => {
    const center = equipmentCenter(sphere);

    expect(center).toEqual({ x: 1, y: -2, z: 3 });
    expect(center).not.toBe(sphere.position);
    expect(Object.isFrozen(center)).toBe(true);
  });

  it("uses explicit displaced volume or falls back to geometric volume", () => {
    const explicit = { ...box, displacedVolume: 7.5 } satisfies EquipmentItem;

    expect(equipmentDisplacedVolume(explicit)).toBe(7.5);
    expect(equipmentDisplacedVolume(cylinder)).toBeCloseTo(equipmentVolume(cylinder), 12);
  });

  it("validates complete equipment items", () => {
    expect(validateEquipmentItem(sphere)).toEqual({ isValid: true });
    expect(validateEquipmentItem(cylinder)).toEqual({ isValid: true });
    expect(validateEquipmentItem(box)).toEqual({ isValid: true });
  });

  it("rejects invalid common fields", () => {
    expect(validateEquipmentItem({ ...sphere, id: " " }).reason).toBe("id is required");
    expect(validateEquipmentItem({ ...sphere, name: " " }).reason).toBe("name is required");
    expect(validateEquipmentItem({ ...sphere, massKg: 0 }).reason).toBe("massKg must be positive");
    expect(validateEquipmentItem({ ...sphere, position: { x: 1, y: Number.NaN, z: 3 } }).reason).toBe(
      "position must be finite",
    );
    expect(validateEquipmentItem({ ...sphere, displacedVolume: -1 }).reason).toBe(
      "displacedVolume must be positive",
    );
  });

  it("rejects invalid shape dimensions", () => {
    expect(validateEquipmentItem({ ...sphere, dimensions: { radius: 0 } }).reason).toBe("radius must be positive");
    expect(validateEquipmentItem({ ...cylinder, dimensions: { radius: 0.5, length: 0 } }).reason).toBe(
      "cylinder radius and length must be positive",
    );
    expect(validateEquipmentItem({ ...box, dimensions: { lengthX: 2, breadthY: 3, heightZ: 0 } }).reason).toBe(
      "box dimensions must be positive",
    );
  });

  it("does not write console output from pure equipment helpers", () => {
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const consoleDebug = vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      equipmentVolume(sphere);
      equipmentCenter(sphere);
      equipmentDisplacedVolume(cylinder);
      validateEquipmentItem({ ...box, dimensions: { lengthX: 2, breadthY: 3, heightZ: 0 } });

      expect(consoleInfo).not.toHaveBeenCalled();
      expect(consoleDebug).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleInfo.mockRestore();
      consoleDebug.mockRestore();
      consoleWarn.mockRestore();
      consoleError.mockRestore();
    }
  });
});
