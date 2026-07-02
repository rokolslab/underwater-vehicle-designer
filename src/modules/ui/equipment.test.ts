import { describe, expect, it } from "vitest";
import { createDefaultEquipmentItem, updateEquipmentItem } from "../equipment/placement";
import { readEquipmentUpdate } from "./equipment";

function row(values: Record<string, string>): HTMLElement {
  return {
    querySelector(selector: string) {
      const field = selector.match(/\[data-field="([^"]+)"\]/)?.[1];
      if (!field || !(field in values)) return null;
      return { value: values[field] };
    },
  } as unknown as HTMLElement;
}

const baseRowValues = {
  name: "Payload",
  massKg: "12",
  x: "1",
  y: "2",
  z: "3",
  orientation: "x",
};

describe("equipment ui", () => {
  it("can read an equipment update without dimensions during shape changes", () => {
    const update = readEquipmentUpdate(
      row({
        ...baseRowValues,
        shape: "cylinder",
        radius: "0.8",
        length: "",
      }),
      { includeDimensions: false },
    );

    expect(update.shape).toBe("cylinder");
    expect(update.dimensions).toBeUndefined();
  });

  it("uses new-shape default dimensions when switching from sphere to cylinder", () => {
    const [sphere] = updateEquipmentItem([createDefaultEquipmentItem({ idFactory: () => "a" })], "a", {
      dimensions: { radius: 0.8 },
    });
    const update = readEquipmentUpdate(
      row({
        ...baseRowValues,
        shape: "cylinder",
        radius: "0.8",
        length: "",
      }),
      { includeDimensions: false },
    );

    const [switched] = updateEquipmentItem([sphere], "a", update);

    expect(switched.shape).toBe("cylinder");
    if (switched.shape !== "cylinder") throw new Error("expected cylinder");
    expect(switched.dimensions).toEqual({ radius: 0.2, length: 0.5 });
  });

  it("uses new-shape default dimensions when switching from sphere to box", () => {
    const sphere = createDefaultEquipmentItem({ idFactory: () => "a" });
    const update = readEquipmentUpdate(
      row({
        ...baseRowValues,
        shape: "box",
        radius: "0.2",
        width: "",
      }),
      { includeDimensions: false },
    );

    const [switched] = updateEquipmentItem([sphere], "a", update);

    expect(switched.shape).toBe("box");
    if (switched.shape !== "box") throw new Error("expected box");
    expect(switched.dimensions).toEqual({ width: 0.4, height: 0.4, depth: 0.4 });
  });
});
