import { describe, expect, it } from "vitest";
import { renderingSemanticStatus, renderingStatusColor } from "./statusColors";

describe("rendering status colors", () => {
  it("mirrors equipment domain severity with rendering-local semantic names", () => {
    expect(renderingSemanticStatus("ok")).toBe("normal");
    expect(renderingSemanticStatus("intersects")).toBe("warning");
    expect(renderingSemanticStatus("outsideHull")).toBe("error");
    expect(renderingSemanticStatus("invalidEquipment")).toBe("error");
  });

  it("uses traceable palette colors for Canvas and Three.js adapters", () => {
    expect(renderingStatusColor("ok")).toMatchObject({
      semanticStatus: "normal",
      canvasStroke: "#075f59",
      materialColor: 0x075f59,
    });
    expect(renderingStatusColor("intersects")).toMatchObject({
      semanticStatus: "warning",
      canvasStroke: "#c77c21",
      materialColor: 0xc77c21,
    });
    expect(renderingStatusColor("outsideHull")).toMatchObject({
      semanticStatus: "error",
      canvasStroke: "#bd3454",
      materialColor: 0xbd3454,
    });
  });
});
