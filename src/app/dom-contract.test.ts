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
  "balance-delta-x",
  "balance-delta-y",
  "balance-bg",
  "balance-warnings",
  "project-import-notice",
];

describe("app DOM contract", () => {
  it("keeps all elements required by main.ts in index.html", () => {
    const html = readFileSync("index.html", "utf8");

    for (const id of requiredIds) {
      expect(html, id).toContain('id="' + id + '"');
    }
  });

  it("keeps the Body axis memo and migration guidance in the app contract", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(html).toContain("X — нос; Y — правый борт; Z — вниз");
    expect(html).toContain("Body-сечение");
    expect(main).toContain("result.migratedFromVersion");
    expect(main).toContain("правом или левом");
  });
});
