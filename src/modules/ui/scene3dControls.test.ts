import { describe, expect, it } from "vitest";
import { updateScene3dControlBounds, type Scene3dControlElements } from "./scene3dControls";

describe("3d scene controls", () => {
  it("sets signed Body X and xy offset bounds by height", () => {
    const sectionX = { min: "", max: "" } as HTMLInputElement;
    const sectionOffset = { min: "", max: "" } as HTMLInputElement;
    const sectionPlane = { value: "xy" } as HTMLSelectElement;
    const elements = { sectionX, sectionOffset, sectionPlane } as Scene3dControlElements;

    updateScene3dControlBounds(elements, { totalLength: 6, maxHalfBreadthY: 1.8, maxHalfHeightZ: 1.2 });

    expect(sectionX.min).toBe("-3");
    expect(sectionX.max).toBe("3");
    expect(sectionOffset.min).toBe("-1.2");
    expect(sectionOffset.max).toBe("1.2");
  });

  it("sets xz offset bounds by breadth", () => {
    const sectionX = { min: "", max: "" } as HTMLInputElement;
    const sectionOffset = { min: "", max: "" } as HTMLInputElement;
    const sectionPlane = { value: "xz" } as HTMLSelectElement;
    const elements = { sectionX, sectionOffset, sectionPlane } as Scene3dControlElements;

    updateScene3dControlBounds(elements, { totalLength: 6, maxHalfBreadthY: 1.8, maxHalfHeightZ: 1.2 });

    expect(sectionOffset.min).toBe("-1.8");
    expect(sectionOffset.max).toBe("1.8");
  });
});
