import { describe, expect, it } from "vitest";
import { maxHullOpacity, minHullOpacity, normalizeScene3dSettings } from "./viewSettings";

const bounds = { totalLength: 6, maxRadius: 1.2 };

describe("3d view settings", () => {
  it("keeps valid x-ray settings", () => {
    const settings = normalizeScene3dSettings(
      { mode: "x-ray", hullOpacity: 0.3, section: { type: "disabled" } },
      bounds,
    );

    expect(settings.mode).toBe("x-ray");
    expect(settings.hullOpacity).toBe(0.3);
    expect(settings.section).toEqual({ type: "disabled" });
  });

  it("normalizes unknown mode and clamps opacity", () => {
    const settings = normalizeScene3dSettings({ mode: "ghost", hullOpacity: 0.9 }, bounds);

    expect(settings.mode).toBe("solid");
    expect(settings.hullOpacity).toBe(maxHullOpacity);
  });

  it("clamps opacity to the lower x-ray bound", () => {
    const settings = normalizeScene3dSettings({ mode: "cutaway", hullOpacity: 0.01 }, bounds);

    expect(settings.hullOpacity).toBe(minHullOpacity);
  });

  it("normalizes cross section position to total length", () => {
    const settings = normalizeScene3dSettings(
      { mode: "cutaway", section: { type: "crossSectionX", x: 99 } },
      bounds,
    );

    expect(settings.section).toEqual({ type: "crossSectionX", x: 6 });
  });

  it("normalizes longitudinal section plane and offset", () => {
    const settings = normalizeScene3dSettings(
      { mode: "cutaway", section: { type: "longitudinalPlane", plane: "bad", offset: -4 } },
      bounds,
    );

    expect(settings.section).toEqual({ type: "longitudinalPlane", plane: "xy", offset: -1.2 });
  });
});
