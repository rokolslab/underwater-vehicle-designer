import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredIds = [
  "profile-canvas",
  "theoretical-drawing-canvas",
  "download-theoretical-drawing-svg",
  "hull-scene-3d",
  "water-density",
  "balance-total-mass",
  "balance-displaced-volume",
  "balance-weight",
  "balance-buoyancy-force",
  "balance-net-buoyancy",
  "balance-center-of-gravity",
  "balance-center-of-buoyancy",
  "balance-moment-arm",
  "balance-warnings",
];

describe("app DOM contract", () => {
  it("keeps all elements required by main.ts in index.html", () => {
    const html = readFileSync("index.html", "utf8");

    for (const id of requiredIds) {
      expect(html, id).toContain('id="' + id + '"');
    }
  });
});
