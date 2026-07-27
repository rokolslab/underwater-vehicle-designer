import "./styles.css";
import { createAppStateController, type LastEdited } from "./appState";
import { makeProjectState, type ProjectState } from "./projectState";
import { calculateEquipmentBalance, DEFAULT_GRAVITY_M_PER_S2, DEFAULT_WATER_DENSITY_KG_PER_M3 } from "../modules/balance/equipment-balance";
import type { EquipmentBalanceResult } from "../modules/balance/model";
import { evaluateEquipmentConstraints, type EquipmentConstraintReport } from "../modules/equipment/constraints";
import { addEquipmentItem, deleteEquipmentItem, updateEquipmentItem } from "../modules/equipment/placement";
import type { EquipmentItem } from "../modules/equipment/model";
import { makeProfileSnapshot } from "../modules/geometry/profile";
import { makeTheoreticalDrawing, type TheoreticalDrawing } from "../modules/geometry/theoretical-drawing";
import { renderCanvasProfile } from "../modules/rendering/canvas2d";
import { renderTheoreticalDrawing } from "../modules/rendering/theoretical-drawing";
import { createHullScene3d } from "../modules/rendering/scene3d";
import { normalizeScene3dSettings } from "../modules/rendering/viewSettings";
import { buildCsv } from "../modules/persistence/csv";
import { buildProjectJson, parseProjectJson, type SerializableProjectState } from "../modules/persistence/project-json";
import { download } from "../modules/persistence/download";
import { buildSvg } from "../modules/persistence/svg";
import { buildTheoreticalDrawingSvg } from "../modules/persistence/theoretical-drawing-svg";
import { renderEquipmentEditor, equipmentIdFromEvent, isEquipmentDeleteEvent, readEquipmentUpdate } from "../modules/ui/equipment";
import { renderBalanceMetrics } from "../modules/ui/metrics";
import { bindScene3dControls, readScene3dControls, updateScene3dControlBounds, writeScene3dControls, type Scene3dControlElements } from "../modules/ui/scene3dControls";
import { renderTable } from "../modules/ui/table";
import { writeIntegerInput, writeNumericInput, type ControlElements } from "../modules/ui/controls";
import { normalizeGeometryMode, type ProfileSnapshot } from "../modules/geometry/model";
import { logger } from "../shared/logger";

function requiredElement<T extends HTMLElement>(selector: string, type: { new (): T }): T {
  const element = document.querySelector(selector);
  if (!(element instanceof type)) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

function readWaterDensity(input: HTMLInputElement): number {
  const requested = Number(input.value);
  if (Number.isFinite(requested) && requested > 0) {
    logger.debug("water density read from UI", { waterDensityKgPerM3: requested });
    return requested;
  }

  logger.warn("water density normalized", { requested: input.value, fallback: DEFAULT_WATER_DENSITY_KG_PER_M3 });
  input.value = String(DEFAULT_WATER_DENSITY_KG_PER_M3);
  return DEFAULT_WATER_DENSITY_KG_PER_M3;
}

const inputs: ControlElements = {
  length: requiredElement("#length", HTMLInputElement),
  slenderness: requiredElement("#slenderness", HTMLInputElement),
  diameter: requiredElement("#diameter", HTMLInputElement),
  cylindricalInsertLength: requiredElement("#cylindrical-insert-length", HTMLInputElement),
  geometryMode: requiredElement("#geometry-mode", HTMLSelectElement),
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
const theoreticalDrawingCanvas = requiredElement("#theoretical-drawing-canvas", HTMLCanvasElement);
const scene3dContainer = requiredElement("#hull-scene-3d", HTMLElement);
const tableBody = requiredElement("#coordinate-rows", HTMLTableSectionElement);
const pointCountEl = requiredElement("#point-count", HTMLElement);
const equipmentList = requiredElement("#equipment-list", HTMLElement);
const addEquipmentButton = requiredElement("#add-equipment", HTMLButtonElement);
const waterDensityInput = requiredElement("#water-density", HTMLInputElement);
const balanceMetrics = {
  totalMass: requiredElement("#balance-total-mass", HTMLElement),
  displacedVolume: requiredElement("#balance-displaced-volume", HTMLElement),
  weight: requiredElement("#balance-weight", HTMLElement),
  buoyancyForce: requiredElement("#balance-buoyancy-force", HTMLElement),
  netBuoyancy: requiredElement("#balance-net-buoyancy", HTMLElement),
  centerOfGravity: requiredElement("#balance-center-of-gravity", HTMLElement),
  centerOfBuoyancy: requiredElement("#balance-center-of-buoyancy", HTMLElement),
  momentArm: requiredElement("#balance-moment-arm", HTMLElement),
  deltaX: requiredElement("#balance-delta-x", HTMLElement),
  deltaY: requiredElement("#balance-delta-y", HTMLElement),
  bg: requiredElement("#balance-bg", HTMLElement),
  warnings: requiredElement("#balance-warnings", HTMLElement),
};
const projectImportNotice = requiredElement("#project-import-notice", HTMLElement);
const downloadSvgButton = requiredElement("#download-svg", HTMLButtonElement);
const downloadCsvButton = requiredElement("#download-csv", HTMLButtonElement);
const downloadProjectJsonButton = requiredElement("#download-project-json", HTMLButtonElement);
const uploadProjectJsonButton = requiredElement("#upload-project-json", HTMLButtonElement);
const projectJsonInput = requiredElement("#project-json-input", HTMLInputElement);
const downloadTheoreticalDrawingSvgButton = requiredElement("#download-theoretical-drawing-svg", HTMLButtonElement);
const resetButton = requiredElement("#reset", HTMLButtonElement);

for (const action of document.querySelectorAll<HTMLElement>(".summary-action, .view-toggle-row")) {
  action.addEventListener("click", (event) => event.stopPropagation());
}

const appState = createAppStateController(inputs);
const hullScene3d = createHullScene3d(scene3dContainer);

for (const details of document.querySelectorAll<HTMLDetailsElement>(".panel-details")) {
  details.addEventListener("toggle", () => {
    if (details.open) {
      window.requestAnimationFrame(() => hullScene3d.resize());
    }
  });
}
let equipmentItems: readonly EquipmentItem[] = [];
let currentSnapshot: ProfileSnapshot;
let currentTheoreticalDrawing: TheoreticalDrawing;
let currentConstraintReport: EquipmentConstraintReport | undefined;
let currentBalanceResult: EquipmentBalanceResult;
let currentProjectState: ProjectState;

function focusedEquipmentField(): { id: string; field: string; selectionStart: number | null; selectionEnd: number | null } | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLInputElement || active instanceof HTMLSelectElement)) return null;
  const row = active.closest<HTMLElement>("[data-equipment-id]");
  const field = active.dataset.field;
  if (!row?.dataset.equipmentId || !field) return null;

  return {
    id: row.dataset.equipmentId,
    field,
    selectionStart: active instanceof HTMLInputElement ? active.selectionStart : null,
    selectionEnd: active instanceof HTMLInputElement ? active.selectionEnd : null,
  };
}

function restoreEquipmentFocus(focusState: ReturnType<typeof focusedEquipmentField>): void {
  if (!focusState) return;
  const selector = `[data-equipment-id="${CSS.escape(focusState.id)}"] [data-field="${CSS.escape(focusState.field)}"]`;
  const nextActive = equipmentList.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!nextActive) return;

  nextActive.focus({ preventScroll: true });
  if (nextActive instanceof HTMLInputElement && nextActive.type === "text" && focusState.selectionStart !== null) {
    nextActive.setSelectionRange(focusState.selectionStart, focusState.selectionEnd ?? focusState.selectionStart);
  }
  logger.debug("[FIX] equipment editor focus restored after render", { id: focusState.id, field: focusState.field });
}

function renderEquipment(): void {
  const focusState = focusedEquipmentField();
  renderEquipmentEditor(equipmentList, equipmentItems, currentConstraintReport);
  restoreEquipmentFocus(focusState);
}

function readFileText(file: File): Promise<string> {
  logger.debug("project json file read started", { name: file.name, size: file.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        logger.debug("project json file read completed", { name: file.name, bytes: reader.result.length });
        resolve(reader.result);
        return;
      }
      reject(new Error("Project file was not read as text."));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Project file read failed.")));
    reader.readAsText(file);
  });
}

function writeProfileControls(profile: SerializableProjectState["profile"]): void {
  writeNumericInput(inputs.length, profile.length);
  writeNumericInput(inputs.slenderness, profile.slenderness);
  writeNumericInput(inputs.diameter, profile.diameter);
  writeNumericInput(inputs.cylindricalInsertLength, profile.cylindricalInsertLength);
  inputs.geometryMode.value = normalizeGeometryMode(profile.geometryMode);
  writeIntegerInput(inputs.stations, profile.stations);
  inputs.showGrid.checked = profile.showGrid;
  inputs.showPoints.checked = profile.showPoints;
  logger.debug("profile controls written from project json", {
    length: profile.length,
    geometryMode: normalizeGeometryMode(profile.geometryMode),
    slenderness: profile.slenderness,
    stations: profile.stations,
  });
}

function applyImportedProject(project: SerializableProjectState): void {
  logger.debug("project json import applying", {
    equipmentCount: project.equipment.length,
    scene3dMode: project.scene3dSettings.mode,
  });
  writeProfileControls(project.profile);
  equipmentItems = project.equipment;
  writeScene3dControls(scene3dControls, project.scene3dSettings);
  writeNumericInput(waterDensityInput, project.balanceSettings.waterDensityKgPerM3);
  update("slenderness");
  logger.info("project json import applied", {
    equipmentCount: project.equipment.length,
    waterDensityKgPerM3: project.balanceSettings.waterDensityKgPerM3,
  });
}

function userFacingImportWarnings(warnings: readonly string[]): readonly string[] {
  const unique = new Set<string>();
  let equipmentNormalizationCount = 0;
  for (const warning of warnings) {
    if (/^(project\.equipment\[|equipment )/i.test(warning)) {
      equipmentNormalizationCount += 1;
      continue;
    }
    unique.add(warning);
  }
  if (equipmentNormalizationCount > 0) {
    unique.add(`Нормализованы данные оборудования (${equipmentNormalizationCount}). Проверьте выделенные строки.`);
  }
  return Object.freeze([...unique]);
}

function showProjectImportNotice(migratedFromVersion: 1 | undefined, warnings: readonly string[]): void {
  const messages = userFacingImportWarnings(warnings).filter((warning) => !warning.includes("старая ось z"));
  const migrationMessage = migratedFromVersion === 1
    ? "Проект v1 успешно преобразован в Body/SNAME-NED. Проверьте, что оборудование осталось на правильном (правом или левом) борту."
    : "Проект успешно импортирован.";
  projectImportNotice.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = migrationMessage;
  projectImportNotice.append(title);
  if (messages.length > 0) {
    const details = document.createElement("span");
    details.textContent = ` ${messages.join(" ")}`;
    projectImportNotice.append(details);
  }
  projectImportNotice.classList.remove("is-hidden");
  projectImportNotice.classList.toggle("project-import-notice--migration", migratedFromVersion === 1);
  projectImportNotice.focus();
  logger.info("project json import notice shown", { migratedFromVersion, userWarningCount: messages.length });
}

function update(source: LastEdited = appState.getLastEdited()): void {
  logger.debug("profile update started", { source, equipmentCount: equipmentItems.length });
  const profile = appState.readState(source);
  currentSnapshot = makeProfileSnapshot(profile);
  currentTheoreticalDrawing = makeTheoreticalDrawing(currentSnapshot);
  logger.debug("theoretical drawing data updated", { sectionCount: currentTheoreticalDrawing.sections.length });

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
  const balanceSettings = {
    waterDensityKgPerM3: readWaterDensity(waterDensityInput),
    gravityMPerS2: DEFAULT_GRAVITY_M_PER_S2,
  };
  currentProjectState = makeProjectState(profile, equipmentItems, scene3dSettings, balanceSettings);

  try {
    currentBalanceResult = calculateEquipmentBalance({
      equipment: currentProjectState.equipment,
      waterDensityKgPerM3: currentProjectState.balanceSettings.waterDensityKgPerM3,
      gravityMPerS2: currentProjectState.balanceSettings.gravityMPerS2,
    });
  } catch (error) {
    logger.error("equipment balance calculation failed", {
      equipmentCount: currentProjectState.equipment.length,
      waterDensityKgPerM3: currentProjectState.balanceSettings.waterDensityKgPerM3,
      error: error instanceof Error ? error.message : String(error),
    });
    currentBalanceResult = calculateEquipmentBalance({ equipment: [] });
  }

  logger.debug("profile snapshot created", {
    length: profile.length,
    cylindricalInsertLength: profile.cylindricalInsertLength,
    totalLength: currentSnapshot.extents.totalLength,
    stations: profile.stations,
    equipmentCount: currentProjectState.equipment.length,
    scene3dMode: currentProjectState.scene3dSettings.mode,
    constraintIssueCount: currentConstraintReport?.issues.length ?? 0,
    invalidEquipmentCount: currentConstraintReport?.issues.filter((issue) => issue.reason === "invalidEquipment").length ?? 0,
    balanceWarningCount: currentBalanceResult.warnings.length,
  });

  renderCanvasProfile(canvas, currentSnapshot, currentProjectState.equipment, currentConstraintReport);
  renderTheoreticalDrawing(theoreticalDrawingCanvas, currentTheoreticalDrawing);
  renderEquipment();
  renderTable(tableBody, pointCountEl, currentSnapshot);
  renderBalanceMetrics(balanceMetrics, currentBalanceResult);
  hullScene3d.render(currentSnapshot, currentProjectState.equipment, currentProjectState.scene3dSettings, currentConstraintReport);
}

inputs.length.addEventListener("input", () => update(appState.getLastEdited()));
inputs.slenderness.addEventListener("input", () => update("slenderness"));
inputs.diameter.addEventListener("input", () => update("diameter"));
inputs.cylindricalInsertLength.addEventListener("input", () => update(appState.getLastEdited()));
inputs.geometryMode.addEventListener("change", () => update(appState.getLastEdited()));
inputs.stations.addEventListener("input", () => update(appState.getLastEdited()));
inputs.showGrid.addEventListener("change", () => update(appState.getLastEdited()));
inputs.showPoints.addEventListener("change", () => update(appState.getLastEdited()));
waterDensityInput.addEventListener("input", () => update(appState.getLastEdited()));
bindScene3dControls(scene3dControls, () => update(appState.getLastEdited()));
window.addEventListener("resize", () => {
  renderCanvasProfile(canvas, currentSnapshot, currentProjectState.equipment, currentConstraintReport);
  renderTheoreticalDrawing(theoreticalDrawingCanvas, currentTheoreticalDrawing);
  hullScene3d.resize();
});
window.addEventListener("beforeunload", () => hullScene3d.dispose());

addEquipmentButton.addEventListener("click", () => {
  const equipmentPanel = addEquipmentButton.closest<HTMLDetailsElement>("details");
  if (equipmentPanel) equipmentPanel.open = true;
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
  download("underwater-vehicle-profile.svg", "image/svg+xml;charset=utf-8", buildSvg(currentSnapshot));
});

downloadCsvButton.addEventListener("click", () => {
  download("underwater-vehicle-profile.csv", "text/csv;charset=utf-8", buildCsv(currentSnapshot));
});

downloadProjectJsonButton.addEventListener("click", () => {
  logger.info("project json export requested", { equipmentCount: currentProjectState.equipment.length });
  download("underwater-vehicle-project.json", "application/json;charset=utf-8", buildProjectJson(currentProjectState));
});

uploadProjectJsonButton.addEventListener("click", () => {
  logger.debug("project json import file picker requested");
  projectJsonInput.click();
});

projectJsonInput.addEventListener("change", async () => {
  const file = projectJsonInput.files?.[0];
  if (!file) return;

  try {
    const json = await readFileText(file);
    const result = parseProjectJson(json);
    if (!result.ok) {
      logger.warn("project json import rejected", { fileName: file.name, error: result.error });
      window.alert(result.error);
      return;
    }

    applyImportedProject(result.project);
    if (result.warnings.length > 0) {
      logger.warn("project json import completed with normalization warnings", {
        fileName: file.name,
        warningCount: result.warnings.length,
      });
    }
    showProjectImportNotice(result.migratedFromVersion, result.warnings);
    logger.info("project json import completed", { fileName: file.name, equipmentCount: result.project.equipment.length });
  } catch (error) {
    logger.error("project json import failed unexpectedly", {
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
    });
    window.alert("Не удалось прочитать файл проекта.");
  } finally {
    projectJsonInput.value = "";
  }
});

downloadTheoreticalDrawingSvgButton.addEventListener("click", () => {
  logger.info("theoretical drawing exported", { sectionCount: currentTheoreticalDrawing.sections.length });
  download("underwater-vehicle-theoretical-drawing.svg", "image/svg+xml;charset=utf-8", buildTheoreticalDrawingSvg(currentTheoreticalDrawing));
});

resetButton.addEventListener("click", () => {
  appState.reset();
  equipmentItems = [];
  waterDensityInput.value = String(DEFAULT_WATER_DENSITY_KG_PER_M3);
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
