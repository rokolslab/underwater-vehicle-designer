import "./styles.css";
import { createAppStateController, type LastEdited } from "./appState";
import { makeProfileSnapshot } from "../modules/geometry/profile";
import { renderCanvasProfile } from "../modules/rendering/canvas2d";
import { buildCsv } from "../modules/persistence/csv";
import { download } from "../modules/persistence/download";
import { buildSvg } from "../modules/persistence/svg";
import { renderMetrics } from "../modules/ui/metrics";
import { renderTable } from "../modules/ui/table";
import type { ControlElements } from "../modules/ui/controls";
import type { ProfileSnapshot } from "../modules/geometry/model";
import { logger } from "../shared/logger";

function requiredElement<T extends HTMLElement>(selector: string, type: { new (): T }): T {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

const inputs: ControlElements = {
  length: requiredElement("#length", HTMLInputElement),
  slenderness: requiredElement("#slenderness", HTMLInputElement),
  diameter: requiredElement("#diameter", HTMLInputElement),
  stations: requiredElement("#stations", HTMLInputElement),
  showGrid: requiredElement("#show-grid", HTMLInputElement),
  showPoints: requiredElement("#show-points", HTMLInputElement),
};

const canvas = requiredElement("#profile-canvas", HTMLCanvasElement);
const tableBody = requiredElement("#coordinate-rows", HTMLTableSectionElement);
const pointCountEl = requiredElement("#point-count", HTMLElement);
const metrics = {
  maxRadius: requiredElement("#max-radius", HTMLElement),
  maxHeight: requiredElement("#max-height", HTMLElement),
  maxX: requiredElement("#max-x", HTMLElement),
};
const downloadSvgButton = requiredElement("#download-svg", HTMLButtonElement);
const downloadCsvButton = requiredElement("#download-csv", HTMLButtonElement);
const resetButton = requiredElement("#reset", HTMLButtonElement);

const appState = createAppStateController(inputs);
let currentSnapshot: ProfileSnapshot;

function update(source: LastEdited = appState.getLastEdited()): void {
  logger.debug("profile update started", { source });
  const state = appState.readState(source);
  currentSnapshot = makeProfileSnapshot(state);
  renderCanvasProfile(canvas, currentSnapshot);
  renderTable(tableBody, pointCountEl, currentSnapshot);
  renderMetrics(metrics, currentSnapshot);
}

inputs.length.addEventListener("input", () => update(appState.getLastEdited()));
inputs.slenderness.addEventListener("input", () => update("slenderness"));
inputs.diameter.addEventListener("input", () => update("diameter"));
inputs.stations.addEventListener("input", () => update(appState.getLastEdited()));
inputs.showGrid.addEventListener("change", () => update(appState.getLastEdited()));
inputs.showPoints.addEventListener("change", () => update(appState.getLastEdited()));
window.addEventListener("resize", () => update(appState.getLastEdited()));

downloadSvgButton.addEventListener("click", () => {
  download("airship-profile.svg", "image/svg+xml;charset=utf-8", buildSvg(currentSnapshot));
});

downloadCsvButton.addEventListener("click", () => {
  download("airship-profile.csv", "text/csv;charset=utf-8", buildCsv(currentSnapshot));
});

resetButton.addEventListener("click", () => {
  appState.reset();
  update("slenderness");
});

try {
  logger.info("application started");
  update("slenderness");
} catch (error) {
  logger.error("application initialization failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}
