import { describe, expect, it } from "vitest";
import { evaluateEquipmentConstraints } from "../equipment/constraints";
import { createDefaultEquipmentItem, updateEquipmentItem } from "../equipment/placement";
import { makeProfileSnapshot } from "../geometry/profile";
import { readEquipmentUpdate, renderEquipmentEditor } from "./equipment";

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
        lengthX: "",
      }),
      { includeDimensions: false },
    );

    const [switched] = updateEquipmentItem([sphere], "a", update);

    expect(switched.shape).toBe("box");
    if (switched.shape !== "box") throw new Error("expected box");
    expect(switched.dimensions).toEqual({ lengthX: 0.4, breadthY: 0.4, heightZ: 0.4 });
  });
  it("renders equipment constraint status and warning text", () => {
    const item = {
      id: "outside",
      name: "Outside",
      shape: "sphere" as const,
      massKg: 1,
      position: { x: 4, y: 1.4, z: 0 },
      orientation: "x" as const,
      dimensions: { radius: 0.2 },
    };
    const report = evaluateEquipmentConstraints(
      makeProfileSnapshot({
        length: 10,
        breadth: 2,
        height: 2,
        slenderness: 5,
        diameter: 2,
        cylindricalInsertLength: 0,
        stations: 10,
        showGrid: true,
        showPoints: true,
      }),
      [item],
    );
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item], report);

    expect(container.innerHTML).toContain("equipment-row--outsideHull");
    expect(container.innerHTML).toContain("Вне корпуса");
    expect(container.innerHTML).toContain("Проблемы компоновки");
  });
  it("labels the equipment name field as designation", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "item-1", name: "Шар 1" });
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item]);

    expect(container.innerHTML).toContain("Наименование");
    expect(container.innerHTML).not.toContain(">Имя<");
  });
  it("renders Body/SNAME-NED directions and metric units", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "item-1" });
    const container = { innerHTML: "" } as HTMLElement;

    renderEquipmentEditor(container, [item]);

    expect(container.innerHTML).toContain("X, м → нос");
    expect(container.innerHTML).toContain("Y, м → правый борт");
    expect(container.innerHTML).toContain("Z, м → вниз");
    expect(container.innerHTML).toContain("X — нос");
  });
});
