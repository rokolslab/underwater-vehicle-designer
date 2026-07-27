import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "../../shared/logger";
import { maxHullOpacity, minHullOpacity, normalizeScene3dSettings } from "./viewSettings";

const bounds = { totalLength: 6, maxHalfBreadthY: 1.8, maxHalfHeightZ: 1.2 };

describe("3d view settings", () => {
  afterEach(() => vi.restoreAllMocks());
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

  it("clamps cross section position to signed Body X bounds", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const settings = normalizeScene3dSettings(
      { mode: "cutaway", section: { type: "crossSectionX", x: 99 } },
      bounds,
    );

    expect(settings.section).toEqual({ type: "crossSectionX", x: 3 });
    expect(warn).toHaveBeenCalledWith("3d body cross section position clamped", expect.objectContaining({
      requested: 99,
      normalized: 3,
      minBodyX: -3,
      maxBodyX: 3,
    }));

    expect(normalizeScene3dSettings(
      { mode: "cutaway", section: { type: "crossSectionX", x: -99 } },
      bounds,
    ).section).toEqual({ type: "crossSectionX", x: -3 });
  });

  it("normalizes longitudinal xy section offset by height", () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
    const settings = normalizeScene3dSettings(
      { mode: "cutaway", section: { type: "longitudinalPlane", plane: "bad", offset: -4 } },
      bounds,
    );

    expect(settings.section).toEqual({ type: "longitudinalPlane", plane: "xy", offset: -1.2 });
    expect(warn).toHaveBeenCalledWith("3d body longitudinal section offset clamped", expect.objectContaining({
      requested: -4,
      normalized: -1.2,
      maxOffset: 1.2,
    }));
  });

  it("clamps longitudinal xz section offset by breadth", () => {
    const settings = normalizeScene3dSettings(
      { mode: "cutaway", section: { type: "longitudinalPlane", plane: "xz", offset: 4 } },
      bounds,
    );

    expect(settings.section).toEqual({ type: "longitudinalPlane", plane: "xz", offset: 1.8 });
  });
});
