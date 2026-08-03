import { describe, expect, it } from "vitest";
import { addEquipmentItem, createDefaultEquipmentItem, deleteEquipmentItem, renameEquipmentItem, updateEquipmentItem } from "./placement";

describe("equipment placement", () => {
  it("creates default equipment with deterministic ids", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "battery-1", name: "Battery" });

    expect(item.id).toBe("battery-1");
    expect(item.name).toBe("Battery");
    expect(item.shape).toBe("sphere");
    expect(item.massKg).toBe(1);
    expect(item.position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("adds items without changing existing order", () => {
    const first = createDefaultEquipmentItem({ idFactory: () => "a" });
    const next = addEquipmentItem([first], { idFactory: () => "b", shape: "box" });

    expect(next.map((item) => item.id)).toEqual(["a", "b"]);
    expect(next[0]).toBe(first);
    expect(next[1].shape).toBe("box");
    expect(next[1].dimensions).toEqual({ lengthX: 0.4, breadthY: 0.4, heightZ: 0.4 });
  });

  it("allocates default IDs from the current collection only", () => {
    const empty = addEquipmentItem([]);
    const sequential = addEquipmentItem(empty);
    const gap = addEquipmentItem([createDefaultEquipmentItem({ idFactory: () => "equipment-1" }), createDefaultEquipmentItem({ idFactory: () => "equipment-3" })]);
    const beforeDelete = addEquipmentItem(sequential);
    const afterDelete = deleteEquipmentItem(beforeDelete, "equipment-2");
    const reused = addEquipmentItem(afterDelete);

    expect(empty.map((item) => item.id)).toEqual(["equipment-1"]);
    expect(sequential.map((item) => item.id)).toEqual(["equipment-1", "equipment-2"]);
    expect(gap.map((item) => item.id)).toEqual(["equipment-1", "equipment-3", "equipment-2"]);
    expect(reused.map((item) => item.id)).toEqual(["equipment-1", "equipment-3", "equipment-2"]);
    expect(sequential.map((item) => item.id)).toEqual(["equipment-1", "equipment-2"]);
    expect(reused[0]).toBe(sequential[0]);
    expect(new Set(reused.map((item) => item.id)).size).toBe(reused.length);
  });

  it("keeps standalone factory local and independent branches deterministic", () => {
    const standalone = createDefaultEquipmentItem();
    const branchA = addEquipmentItem([]);
    const branchB = addEquipmentItem([]);

    expect(standalone.id).toBe("equipment-1");
    expect(branchA.map((item) => item.id)).toEqual(["equipment-1"]);
    expect(branchB.map((item) => item.id)).toEqual(["equipment-1"]);
  });

  it("uses custom factories once and resolves collection-level collisions", () => {
    const items = [
      createDefaultEquipmentItem({ idFactory: () => "payload" }),
      createDefaultEquipmentItem({ idFactory: () => "payload-3" }),
    ];
    let collisionCalls = 0;
    const collision = addEquipmentItem(items, {
      idFactory: () => {
        collisionCalls += 1;
        return "payload";
      },
    });
    let freeCalls = 0;
    const free = addEquipmentItem(items, {
      idFactory: () => {
        freeCalls += 1;
        return "free-id";
      },
    });
    let blankCalls = 0;
    const blankFallback = addEquipmentItem(
      [createDefaultEquipmentItem({ idFactory: () => "equipment-1" }), createDefaultEquipmentItem({ idFactory: () => "equipment-3" })],
      {
        idFactory: () => {
          blankCalls += 1;
          return "  ";
        },
      },
    );

    expect(collisionCalls).toBe(1);
    expect(freeCalls).toBe(1);
    expect(blankCalls).toBe(1);
    expect(collision.map((item) => item.id)).toEqual(["payload", "payload-3", "payload-4"]);
    expect(free.map((item) => item.id)).toEqual(["payload", "payload-3", "free-id"]);
    expect(blankFallback.map((item) => item.id)).toEqual(["equipment-1", "equipment-3", "equipment-2"]);
    expect(collision[0]).toBe(items[0]);
    expect(collision[1]).toBe(items[1]);
    expect(new Set(collision.map((item) => item.id)).size).toBe(collision.length);
  });

  it("preserves spaces while renaming equipment", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "a", name: "Battery" });

    const [renamed] = renameEquipmentItem([item], "a", "Battery pack ");

    expect(renamed.name).toBe("Battery pack ");
  });
  it("updates and renames by stable id", () => {
    const items = [
      createDefaultEquipmentItem({ idFactory: () => "a" }),
      createDefaultEquipmentItem({ idFactory: () => "b" }),
    ];

    const updated = updateEquipmentItem(items, "b", {
      massKg: 12,
      position: { x: 1, y: -0.5, z: 0.25 },
      dimensions: { radius: 0.3 },
    });
    const renamed = renameEquipmentItem(updated, "b", "Payload");

    expect(renamed[0]).toBe(items[0]);
    expect(renamed[1].name).toBe("Payload");
    expect(renamed[1].massKg).toBe(12);
    expect(renamed[1].position).toEqual({ x: 1, y: -0.5, z: 0.25 });
  });

  it("normalizes invalid numeric values to positive fallbacks", () => {
    const item = createDefaultEquipmentItem({ idFactory: () => "a" });
    const [updated] = updateEquipmentItem([item], "a", {
      massKg: -10,
      dimensions: { radius: -2 },
    });

    expect(updated.massKg).toBe(Number.EPSILON);
    expect(updated.shape).toBe("sphere");
    if (updated.shape !== "sphere") throw new Error("expected sphere");
    expect(updated.dimensions.radius).toBe(Number.EPSILON);
  });

  it("switches shape and deletes by id", () => {
    const items = [
      createDefaultEquipmentItem({ idFactory: () => "a" }),
      createDefaultEquipmentItem({ idFactory: () => "b" }),
    ];
    const switched = updateEquipmentItem(items, "a", { shape: "cylinder", dimensions: { radius: 0.4, length: 1.2 } });
    const deleted = deleteEquipmentItem(switched, "b");

    expect(switched[0].shape).toBe("cylinder");
    expect(switched[0].dimensions).toEqual({ radius: 0.4, length: 1.2 });
    expect(deleted.map((item) => item.id)).toEqual(["a"]);
  });

  it("keeps the same list when updating an unknown id", () => {
    const items = [createDefaultEquipmentItem({ idFactory: () => "a" })];

    expect(updateEquipmentItem(items, "missing", { name: "Nope" })).toBe(items);
    expect(deleteEquipmentItem(items, "missing")).toBe(items);
  });
});
