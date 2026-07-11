import { describe, expect, it } from "vitest";
import { updateScene3dControlBounds, type Scene3dControlElements } from "./scene3dControls";

describe("3d scene controls", () => {
  it("sets signed Body X and radial offset bounds", () => {
    const sectionX = { min: "", max: "" } as HTMLInputElement;
    const sectionOffset = { min: "", max: "" } as HTMLInputElement;
    const elements = { sectionX, sectionOffset } as Scene3dControlElements;

    updateScene3dControlBounds(elements, 6, 1.2);

    expect(sectionX.min).toBe("-3");
    expect(sectionX.max).toBe("3");
    expect(sectionOffset.min).toBe("-1.2");
    expect(sectionOffset.max).toBe("1.2");
  });
});
