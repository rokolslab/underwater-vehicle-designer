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
    expect(html).toContain('/images/hero-hull-render.png');
    expect(html).toContain("Скриншот рабочей Three.js-сцены");
    expect(html).toContain('id="visualization"');
    expect(html).toContain('name="theme-color" content="#07191f"');
  });

  it("keeps balance visibly experimental and collapsed by default", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('<details class="balance-band panel-details">');
    expect(html).toContain("Баланс оборудования");
    expect(html).toContain("Experimental");
    expect(html).toContain("не полный расчет гидростатики");
  });

  it("keeps static numeric controls mobile-keyboard friendly", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('id="length" type="number" inputmode="decimal"');
    expect(html).toContain('id="stations" type="number" inputmode="numeric"');
    expect(html).toContain('id="water-density" type="number" inputmode="numeric"');
    expect(html).toContain('id="scene3d-section-x" type="number" inputmode="decimal"');
  });

  it("keeps the Body axis memo and migration guidance in the app contract", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(html).toContain("X — нос; Y — правый борт; Z — вниз");
    expect(html).toContain("Сечение");
    expect(html).toContain("Сечения задаются в Body/SNAME-NED");
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

  it("uses product terminology for geometry mode labels in the UI", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('value="current-formula">Базовая формула</option>');
    expect(html).toContain('value="legacy-dsnp-pa">Классическая методика</option>');
    expect(html).not.toContain('value="current-formula">Текущая</option>');
    expect(html).not.toContain('value="legacy-dsnp-pa">ДСНП_ПА</option>');
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
    expect(main).toContain("import type { ProjectCommand }");
    expect(main).toContain("prepareProjectImport(json)");
    expect(main).toContain('projectStore.dispatch({ type: "ReplaceProject", project: result.inputs })');
    expect(main).toContain("inputsAndViewToSerializableProject(projectStore.getSnapshot(), projectViewState)");
    expect(main).toContain("projectImportRequestToken");
    expect(main).not.toContain("appState.applyImportedGravityMPerS2");
    expect(main).not.toContain("appState.makeCurrentBalanceSettings");
    expect(main).not.toContain("buildProjectJson(currentProjectState)");
  });

  it("keeps removed temporary ProjectState out of app sources", () => {
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(main).not.toContain("makeProjectState");
    expect(main).not.toContain("currentProjectState");
  });
});
