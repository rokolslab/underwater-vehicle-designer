import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const requiredIds = [
  "profile-canvas",
  "breadth",
  "height",
  "geometry-formula",
  "theoretical-drawing-canvas",
  "download-theoretical-drawing-svg",
  "hull-scene-3d",
  "scene3d-fallback",
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

  it("keeps the public demo product identity and technical hero preview", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain("Underwater Vehicle Designer");
    expect(html).toContain('class="hull-blueprint"');
    expect(html).toContain('id="visualization"');
    expect(html).toContain('name="theme-color" content="#07191f"');
  });

  it("keeps the Body axis memo and migration guidance in the app contract", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(html).toContain("X — нос; Y — правый борт; Z — вниз");
    expect(html).toContain("Body-сечение");
    expect(html).toContain("theoretical-drawing-scroll");
    expect(main).toContain("result.migratedFromVersion");
    expect(main).toContain("правом или левом");
  });

  it("exposes B/H controls and removes the standalone diameter input", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(html).toContain("Ширина B");
    expect(html).toContain("Высота H");
    expect(html).toContain("Удлинение λ = L / H");
    expect(html).not.toContain('id="diameter"');
    expect(main).toContain('requiredElement("#geometry-formula"');
  });

  it("keeps the 3D scene touch contract scroll-friendly", () => {
    const styles = readFileSync("src/app/styles.css", "utf8");
    const scene3d = readFileSync("src/modules/rendering/scene3d.ts", "utf8");

    expect(styles).toContain("touch-action: pan-y");
    expect(styles).not.toContain("touch-action: none");
    expect(scene3d).toContain('container.addEventListener("pointercancel", onPointerUp)');
    expect(scene3d).toContain("activePointerId");
  });

  it("exposes a visible 3D fallback contract", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");
    const scene3d = readFileSync("src/modules/rendering/scene3d.ts", "utf8");

    expect(html).toContain('id="scene3d-fallback"');
    expect(html).toContain("3D недоступен в этом браузере");
    expect(main).toContain("hullScene3d.isAvailable");
    expect(scene3d).toContain("readonly isAvailable: boolean");
    expect(scene3d).toContain("readonly failureReason: string | null");
  });

  it("keeps visualization resize lifecycle wired through one scheduler", () => {
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(main).toContain("function scheduleRenderResize()");
    expect(main).toContain("window.requestAnimationFrame");
    expect(main).toContain("new ResizeObserver");
    expect(main).toContain("resizeObserver?.disconnect()");
    expect(main).toContain('window.addEventListener("resize", scheduleRenderResize)');
  });

  it("keeps canonical project ownership out of DOM round-trips", () => {
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(main).toContain("const projectStore = createProjectStore(createDefaultProjectInputs())");
    expect(main).toContain("prepareProjectImport(json)");
    expect(main).toContain("projectStore.replaceProject(result.inputs)");
    expect(main).toContain("inputsAndViewToSerializableProject(projectStore.getSnapshot(), projectViewState)");
    expect(main).toContain("projectImportRequestToken");
    expect(main).not.toContain("appState.applyImportedGravityMPerS2");
    expect(main).not.toContain("appState.makeCurrentBalanceSettings");
    expect(main).not.toContain("buildProjectJson(currentProjectState)");
  });
});
