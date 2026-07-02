import "./styles.css";
import { createAppStateController, type LastEdited } from "./appState";
import { makeProjectState, type ProjectState } from "./projectState";
import { evaluateEquipmentConstraints, type EquipmentConstraintReport } from "../modules/equipment/constraints";
import { addEquipmentItem, deleteEquipmentItem, updateEquipmentItem } from "../modules/equipment/placement";
import type { EquipmentItem } from "../modules/equipment/model";
import { makeProfileSnapshot } from "../modules/geometry/profile";
import { renderCanvasProfile } from "../modules/rendering/canvas2d";
import { createHullScene3d } from "../modules/rendering/scene3d";
import { normalizeScene3dSettings } from "../modules/rendering/viewSettings";
import { buildCsv } from "../modules/persistence/csv";
import { download } from "../modules/persistence/download";
import { buildSvg } from "../modules/persistence/svg";
import { renderEquipmentEditor, equipmentIdFromEvent, isEquipmentDeleteEvent, readEquipmentUpdate } from "../modules/ui/equipment";
import { renderMetrics } from "../modules/ui/metrics";
import { bindScene3dControls, readScene3dControls, updateScene3dControlBounds, type Scene3dControlElements } from "../modules/ui/scene3dControls";
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
  cylindricalInsertLength: requiredElement("#cylindrical-insert-length", HTMLInputElement),
  stations: requiredElement("#stations", HTMLInputElement),
  showGrid: requiredElement("#show-grid", HTMLInputElement),
  showPoints: requiredElement("#show-points", HTMLInputElement),
};

const scene3dControls: Scene3dControlElements = {
  mode: requiredElement("#scene3d-mode", HTMLSelectElement),
  opacity: requiredElement("#scene3d-opacity", HTMLInputElement),
  sectionType: requiredElement("#scene3d-section-type", HTMLSelectElement),
  sectionX: requiredElement("#scene3d-section-x", HTMLInputElement),
  sectionPlane: requiredElement("#scene3d-section-plane", HTMLSelectElement),
  sectionOffset: requiredElement("#scene3d-section-offset", HTMLInputElement),
};

const canvas = requiredElement("#profile-canvas", HTMLCanvasElement);
const scene3dContainer = requiredElement("#hull-scene-3d", HTMLElement);
const tableBody = requiredElement("#coordinate-rows", HTMLTableSectionElement);
const pointCountEl = requiredElement("#point-count", HTMLElement);
const equipmentList = requiredElement("#equipment-list", HTMLElement);
const addEquipmentButton = requiredElement("#add-equipment", HTMLButtonElement);
const metrics = {
  maxRadius: requiredElement("#max-radius", HTMLElement),
  maxHeight: requiredElement("#max-height", HTMLElement),
  maxX: requiredElement("#max-x", HTMLElement),
  totalLength: requiredElement("#total-length", HTMLElement),
  cylindricalInsertLength: requiredElement("#cylindrical-insert-length-metric", HTMLElement),
};
const downloadSvgButton = requiredElement("#download-svg", HTMLButtonElement);
const downloadCsvButton = requiredElement("#download-csv", HTMLButtonElement);
const resetButton = requiredElement("#reset", HTMLButtonElement);

const appState = createAppStateController(inputs);
const hullScene3d = createHullScene3d(scene3dContainer);
let equipmentItems: readonly EquipmentItem[] = [];
let currentSnapshot: ProfileSnapshot;
let currentConstraintReport: EquipmentConstraintReport | undefined;
let currentProjectState: ProjectState;

function renderEquipment(): void {
  renderEquipmentEditor(equipmentList, equipmentItems, currentConstraintReport);
}

function update(source: LastEdited = appState.getLastEdited()): void {
  logger.debug("profile update started", { source, equipmentCount: equipmentItems.length });
  const profile = appState.readState(source);
  currentSnapshot = makeProfileSnapshot(profile);

  try {
    currentConstraintReport = evaluateEquipmentConstraints(currentSnapshot, equipmentItems);
  } catch (error) {
    currentConstraintReport = undefined;
    logger.error("equipment constraints evaluation failed", {
      equipmentCount: equipmentItems.length,
      length: profile.length,
      cylindricalInsertLength: profile.cylindricalInsertLength,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  updateScene3dControlBounds(scene3dControls, currentSnapshot.extents.totalLength, currentSnapshot.extents.maxRadius);
  const scene3dSettings = normalizeScene3dSettings(readScene3dControls(scene3dControls), {
    totalLength: currentSnapshot.extents.totalLength,
    maxRadius: currentSnapshot.extents.maxRadius,
  });
  currentProjectState = makeProjectState(profile, equipmentItems, scene3dSettings);
  logger.debug("profile snapshot created", {
    length: profile.length,
    cylindricalInsertLength: profile.cylindricalInsertLength,
    totalLength: currentSnapshot.extents.totalLength,
    stations: profile.stations,
    equipmentCount: currentProjectState.equipment.length,
    scene3dMode: currentProjectState.scene3dSettings.mode,
    constraintIssueCount: currentConstraintReport?.issues.length ?? 0,
    invalidEquipmentCount: currentConstraintReport?.issues.filter((issue) => issue.reason === "invalidEquipment").length ?? 0,
  });

  renderCanvasProfile(canvas, currentSnapshot, currentProjectState.equipment, currentConstraintReport);
  renderEquipment();
  renderTable(tableBody, pointCountEl, currentSnapshot);
  renderMetrics(metrics, currentSnapshot);
  hullScene3d.render(currentSnapshot, currentProjectState.equipment, currentProjectState.scene3dSettings, currentConstraintReport);
}

inputs.length.addEventListener("input", () => update(appState.getLastEdited()));
inputs.slenderness.addEventListener("input", () => update("slenderness"));
inputs.diameter.addEventListener("input", () => update("diameter"));
inputs.cylindricalInsertLength.addEventListener("input", () => update(appState.getLastEdited()));
inputs.stations.addEventListener("input", () => update(appState.getLastEdited()));
inputs.showGrid.addEventListener("change", () => update(appState.getLastEdited()));
inputs.showPoints.addEventListener("change", () => update(appState.getLastEdited()));
bindScene3dControls(scene3dControls, () => update(appState.getLastEdited()));
window.addEventListener("resize", () => {
  renderCanvasProfile(canvas, currentSnapshot, currentProjectState.equipment, currentConstraintReport);
  hullScene3d.resize();
});
window.addEventListener("beforeunload", () => hullScene3d.dispose());

addEquipmentButton.addEventListener("click", () => {
  equipmentItems = addEquipmentItem(equipmentItems);
  logger.info("equipment added by user", { count: equipmentItems.length });
  update(appState.getLastEdited());
});

equipmentList.addEventListener("click", (event) => {
  if (!isEquipmentDeleteEvent(event)) return;
  const id = equipmentIdFromEvent(event);
  if (!id) return;
  equipmentItems = deleteEquipmentItem(equipmentItems, id);
  logger.info("equipment deleted by user", { id, count: equipmentItems.length });
  update(appState.getLastEdited());
});

equipmentList.addEventListener("change", (event) => {
  const id = equipmentIdFromEvent(event);
  const target = event.target;
  if (!id || !(target instanceof HTMLElement)) return;
  const row = target.closest<HTMLElement>("[data-equipment-id]");
  if (!row) return;
  const previousShape = equipmentItems.find((item) => item.id === id)?.shape;
  const nextShape = row.querySelector<HTMLSelectElement>('[data-field="shape"]')?.value;
  const isShapeChange = target instanceof HTMLSelectElement && target.dataset.field === "shape" && previousShape !== nextShape;
  if (isShapeChange) {
    logger.debug("[FIX] equipment shape change uses default dimensions", { id, previousShape, nextShape });
  }
  equipmentItems = updateEquipmentItem(equipmentItems, id, readEquipmentUpdate(row, { includeDimensions: !isShapeChange }));
  update(appState.getLastEdited());
});

equipmentList.addEventListener("input", (event) => {
  const id = equipmentIdFromEvent(event);
  const target = event.target;
  if (!id || !(target instanceof HTMLElement) || target instanceof HTMLSelectElement) return;
  const row = target.closest<HTMLElement>("[data-equipment-id]");
  if (!row) return;
  logger.debug("equipment state read from UI", { id });
  equipmentItems = updateEquipmentItem(equipmentItems, id, readEquipmentUpdate(row));
  update(appState.getLastEdited());
});

downloadSvgButton.addEventListener("click", () => {
  download("airship-profile.svg", "image/svg+xml;charset=utf-8", buildSvg(currentSnapshot));
});

downloadCsvButton.addEventListener("click", () => {
  download("airship-profile.csv", "text/csv;charset=utf-8", buildCsv(currentSnapshot));
});

resetButton.addEventListener("click", () => {
  appState.reset();
  equipmentItems = [];
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
