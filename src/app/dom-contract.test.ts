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
  "summary-dimensions",
  "summary-geometry-mode",
  "summary-stations",
  "summary-equipment-count",
  "summary-constraints",
  "summary-balance",
  "project-import-notice",
  "equipment-inspector",
  "diagnostics-panel",
  "diagnostics-queue",
  "diagnostics-empty",
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

  it("exposes the workbench shell zones without replacing existing panels", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('<section class="workbench" aria-labelledby="workbench-title">');
    expect(html).toContain('class="workbench-shell-head"');
    expect(html).toContain('class="workbench-project-strip" aria-labelledby="workbench-title"');
    expect(html).toContain('class="engineering-summary-strip" aria-labelledby="engineering-summary-title"');
    expect(html).toContain('class="workbench-zone hull-controls-zone" aria-labelledby="hull-controls-title"');
    expect(html).toContain('class="workbench-zone viewport-zone" aria-labelledby="viewport-zone-title"');
    expect(html).toContain('class="workbench-zone equipment-zone" aria-labelledby="equipment-zone-title"');
    expect(html).toContain('class="workbench-zone diagnostics-zone" aria-labelledby="diagnostics-zone-title"');
    expect(html).toContain('class="workbench-zone export-data-zone" aria-labelledby="export-data-zone-title"');
    expect(html).toContain("Оборудование и размещение");
    expect(html).toContain("Диагностика и equipment-only баланс");
    expect(html).toContain("Координаты станций расчетного профиля");
    expect(html).toContain('<details class="control-panel panel-details" open>');
    expect(html).toContain('<details class="drawing-panel panel-details" open>');
    expect(html).toContain('<details class="scene3d-panel panel-details" open>');
    expect(html).toContain('<details class="equipment-band panel-details" open>');
    expect(html).toContain('<details class="balance-band panel-details">');
    expect(html).toContain('<details class="theoretical-drawing-band panel-details" open>');
    expect(html).toContain('<details class="data-band panel-details" open>');
  });

  it("keeps project-level JSON and reset actions in the upper workbench toolbar", () => {
    const html = readFileSync("index.html", "utf8");
    const toolbarStart = html.indexOf('class="workbench-toolbar"');
    const toolbarEnd = html.indexOf('</section>', toolbarStart);
    const toolbar = html.slice(toolbarStart, toolbarEnd);

    expect(toolbarStart).toBeGreaterThan(-1);
    expect(toolbar).toContain('aria-label="Операции проекта и переходы по рабочему экрану"');
    expect(toolbar).toContain('id="download-project-json"');
    expect(toolbar).toContain('id="upload-project-json"');
    expect(toolbar).toContain('id="project-json-input"');
    expect(toolbar).toContain('id="reset"');
    expect(toolbar).toContain('href="#controls"');
    expect(toolbar).toContain('href="#visualization"');
    expect(toolbar).not.toContain('id="download-svg"');
    expect(toolbar).not.toContain('id="download-csv"');
    expect(toolbar).not.toContain('id="download-theoretical-drawing-svg"');
  });

  it("keeps shell accessibility labels and semantic summary statuses visible", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('aria-label="Операции проекта и переходы по рабочему экрану"');
    expect(html).toContain('aria-label="Переходы по рабочим зонам"');
    expect(html).toContain('<legend>Геометрия корпуса</legend>');
    expect(html).toContain('<legend>Метод и формула</legend>');
    expect(html).toContain('<legend>Расчётные настройки</legend>');
    expect(html).toContain('id="summary-constraints" class="summary-status ui-status--normal" data-ui-status="normal">Норма</dd>');
    expect(html).toContain('id="summary-balance" class="summary-status ui-status--experimental" data-ui-status="experimental">Experimental: equipment-only</dd>');
    expect(html).not.toContain("orientation-cube");
    expect(html).not.toContain("camera-preset");
    expect(html).not.toContain("selectedEquipmentId");
  });

  it("keeps engineering exports near their owning workbench surfaces", () => {
    const html = readFileSync("index.html", "utf8");
    const profileIndex = html.indexOf('id="profile-canvas"');
    const svgIndex = html.indexOf('id="download-svg"');
    const theoreticalCanvasIndex = html.indexOf('id="theoretical-drawing-canvas"');
    const theoreticalSvgIndex = html.indexOf('id="download-theoretical-drawing-svg"');
    const tableIndex = html.indexOf('id="coordinate-rows"');
    const csvIndex = html.indexOf('id="download-csv"');

    expect(svgIndex).toBeGreaterThan(-1);
    expect(profileIndex).toBeGreaterThan(-1);
    expect(Math.abs(profileIndex - svgIndex)).toBeLessThan(1600);
    expect(theoreticalSvgIndex).toBeGreaterThan(-1);
    expect(theoreticalCanvasIndex).toBeGreaterThan(-1);
    expect(Math.abs(theoreticalCanvasIndex - theoreticalSvgIndex)).toBeLessThan(900);
    expect(csvIndex).toBeGreaterThan(-1);
    expect(tableIndex).toBeGreaterThan(-1);
    expect(Math.abs(tableIndex - csvIndex)).toBeLessThan(1300);
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

  it("groups hull controls into geometry, method and calculation clusters", () => {
    const html = readFileSync("index.html", "utf8");
    const controlsStart = html.indexOf('<form id="controls" class="control-grid">');
    const controlsEnd = html.indexOf("</form>", controlsStart);
    const controls = html.slice(controlsStart, controlsEnd);

    expect(controlsStart).toBeGreaterThan(-1);
    expect(controls).toContain('class="control-cluster control-cluster--geometry"');
    expect(controls).toContain("Геометрия корпуса");
    expect(controls).toContain('id="length"');
    expect(controls).toContain('id="breadth"');
    expect(controls).toContain('id="height"');
    expect(controls).toContain('id="cylindrical-insert-length"');
    expect(controls).toContain('class="control-cluster control-cluster--method"');
    expect(controls).toContain("Метод и формула");
    expect(controls).toContain('id="geometry-mode"');
    expect(controls).toContain('id="geometry-formula"');
    expect(controls).toContain('class="control-cluster control-cluster--calculation"');
    expect(controls).toContain("Расчётные настройки");
    expect(controls).toContain('id="water-density"');
    expect(controls).not.toContain('id="download-project-json"');
    expect(controls).not.toContain('id="reset"');
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
    expect(html).toContain('id="scene3d-fallback" class="scene3d-fallback ui-status--warning is-hidden" data-ui-status="warning"');
    expect(html).toContain("3D недоступен в этом браузере");
    expect(main).toContain("hullScene3d.isAvailable");
    expect(scene3d).toContain("readonly isAvailable: boolean");
    expect(scene3d).toContain("readonly failureReason: string | null");
  });

  it("keeps static runtime status surfaces semantically marked", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('id="project-import-notice" class="project-import-notice is-hidden" data-ui-status="normal"');
    expect(html).toContain('class="experimental-pill ui-status--experimental" data-ui-status="experimental"');
  });

  it("describes existing canvas-like surfaces without adding new viewport controls", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).toContain('id="profile-canvas" aria-label="Теоретический обвод подводного аппарата" aria-describedby="profile-canvas-description"');
    expect(html).toContain('id="hull-scene-3d" class="scene3d" aria-label="3D-модель корпуса" aria-describedby="scene3d-description"');
    expect(html).toContain('id="theoretical-drawing-canvas" aria-label="Теоретический чертеж корпуса подводного аппарата" aria-describedby="theoretical-drawing-description"');
    expect(html).not.toContain("orientation-cube");
  });

  it("keeps interactive controls out of summary headers", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");
    const summaries = html.match(/<summary[\s\S]*?<\/summary>/g) ?? [];

    expect(summaries.length).toBeGreaterThan(0);
    for (const summary of summaries) {
      expect(summary).not.toContain("<button");
      expect(summary).not.toContain("<input");
      expect(summary).not.toContain("<select");
      expect(summary).not.toContain("<label");
    }
    expect(html).not.toContain("summary-action");
    expect(main).not.toContain("stopPropagation");
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

  it("exposes equipment selection markers as separate from engineering status", () => {
    const equipment = readFileSync("src/modules/ui/equipment.ts", "utf8");

    expect(equipment).toContain("data-equipment-selected");
    expect(equipment).toContain("aria-selected");
    expect(equipment).toContain("equipment-row--selected");
    expect(equipment).not.toContain('data-equipment-selected="true" aria-selected="true" /></div>');
  });

  it("keeps WorkbenchInteractionState out of project JSON and DOM id", () => {
    const html = readFileSync("index.html", "utf8");

    expect(html).not.toContain("selectedEquipmentId");
    expect(html).not.toContain("hoveredEquipmentId");
    expect(html).not.toContain("WorkbenchInteractionState");
  });

  it("requires confirmation dialog before equipment deletion", () => {
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(main).toContain('window.confirm("Удалить выбранное оборудование?")');
    expect(main).toContain("[ui.equipment] delete confirmed");
    expect(main).toContain("[ui.equipment] delete cancelled");
  });

  it("exposes diagnostics panel with safe anchors separate from balance warnings", () => {
    const html = readFileSync("index.html", "utf8");
    const main = readFileSync("src/app/main.ts", "utf8");

    expect(html).toContain('id="diagnostics-panel"');
    expect(html).toContain('id="diagnostics-queue"');
    expect(html).toContain('id="diagnostics-empty"');
    expect(main).toContain("makeDiagnosticsViewModel");
    expect(main).toContain("renderDiagnostics");
    expect(html).not.toContain('id="diagnostics-panel" id="balance-warnings"');
  });
});
