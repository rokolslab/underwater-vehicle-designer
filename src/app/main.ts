import "./styles.css";
import { createAppStateController, type LastEdited } from "./appState";
import { DEFAULT_WATER_DENSITY_KG_PER_M3 } from "../modules/balance/equipment-balance";
import { createDefaultProjectInputs } from "../application/project/defaults";
import { deriveProject } from "../application/project/derive";
import type { ProjectInputs, ProjectProfileInputs } from "../application/project/model";
import { projectProfileInputsWithViewToProfileState } from "../application/project/normalize";
import { createProjectStore } from "../application/project/store";
import { addEquipmentItem, deleteEquipmentItem, updateEquipmentItem } from "../modules/equipment/placement";
import { renderCanvasProfile } from "../modules/rendering/canvas2d";
import { renderTheoreticalDrawing } from "../modules/rendering/theoretical-drawing";
import { createHullScene3d } from "../modules/rendering/scene3d";
import { defaultScene3dSettings, normalizeScene3dSettings } from "../modules/rendering/viewSettings";
import { buildCsv } from "../modules/persistence/csv";
import { buildProjectJson } from "../modules/persistence/project-json";
import { download } from "../modules/persistence/download";
import { buildSvg } from "../modules/persistence/svg";
import { buildTheoreticalDrawingSvg } from "../modules/persistence/theoretical-drawing-svg";
import { renderEquipmentEditor, equipmentIdFromEvent, isEquipmentDeleteEvent, readEquipmentUpdate } from "../modules/ui/equipment";
import { renderBalanceMetrics } from "../modules/ui/metrics";
import { bindScene3dControls, readScene3dControls, updateScene3dControlBounds, writeScene3dControls, type Scene3dControlElements } from "../modules/ui/scene3dControls";
import { renderTable } from "../modules/ui/table";
import { writeIntegerInput, writeNumericInput, type ControlElements } from "../modules/ui/controls";
import { geometryModePresentation, normalizeGeometryMode, type ProfileSnapshot } from "../modules/geometry/model";
import { logger } from "../shared/logger";
import { createProjectEvaluationRuntime, type ProjectEvaluationPublication } from "./projectEvaluationRuntime";
import { prepareProjectImport, type PreparedProjectImportResult } from "./projectImport";
import { inputsAndViewToSerializableProject, type ProjectViewState } from "./projectProjection";

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
  breadth: requiredElement("#breadth", HTMLInputElement),
  height: requiredElement("#height", HTMLInputElement),
  slenderness: requiredElement("#slenderness", HTMLInputElement),
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
const scene3dFallback = requiredElement("#scene3d-fallback", HTMLElement);
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
const geometryFormula = requiredElement("#geometry-formula", HTMLElement);
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

if (!hullScene3d.isAvailable) {
  scene3dFallback.classList.remove("is-hidden");
}

function writeGeometryModePresentation(geometryMode: unknown): void {
  const normalizedMode = normalizeGeometryMode(geometryMode);
  for (const option of inputs.geometryMode.options) {
    option.textContent = geometryModePresentation(option.value).label;
  }
  geometryFormula.textContent = geometryModePresentation(normalizedMode).formulaText;
}

const panelDetails = Array.from(document.querySelectorAll<HTMLDetailsElement>(".panel-details"));
const projectStore = createProjectStore(createDefaultProjectInputs());
let projectViewState: ProjectViewState = Object.freeze({
  showGrid: true,
  showPoints: true,
  scene3dSettings: defaultScene3dSettings,
});
let resizeFrame: number | null = null;
let projectImportRequestToken = 0;

function scene3dBoundsFromSnapshot(snapshot: ProfileSnapshot) {
  return Object.freeze({
    totalLength: snapshot.extents.totalLength,
    maxHalfBreadthY: snapshot.extents.maxHalfBreadthY,
    maxHalfHeightZ: snapshot.extents.maxHalfHeightZ,
  });
}

function renderPublication(publication: ProjectEvaluationPublication): void {
  const { inputsSnapshot, evaluation } = publication;
  const scene3dBounds = scene3dBoundsFromSnapshot(evaluation.hullGeometry);
  updateScene3dControlBounds(scene3dControls, scene3dBounds);
  const scene3dSettings = normalizeScene3dSettings(projectViewState.scene3dSettings, scene3dBounds);
  if (scene3dSettings !== projectViewState.scene3dSettings) {
    replaceProjectViewState({ ...projectViewState, scene3dSettings });
    writeScene3dControls(scene3dControls, scene3dSettings);
  }

  logger.debug("project evaluation rendered", {
    length: evaluation.hullGeometry.state.length,
    breadth: evaluation.hullGeometry.state.breadth,
    height: evaluation.hullGeometry.state.height,
    cylindricalInsertLength: evaluation.hullGeometry.state.cylindricalInsertLength,
    totalLength: evaluation.hullGeometry.extents.totalLength,
    stations: evaluation.hullGeometry.state.stations,
    equipmentCount: inputsSnapshot.equipment.length,
    scene3dMode: scene3dSettings.mode,
    constraintIssueCount: evaluation.constraints.issues.length,
    invalidEquipmentCount: evaluation.constraints.issues.filter((issue) => issue.reason === "invalidEquipment").length,
    balanceWarningCount: evaluation.balance.warnings.length,
  });

  renderCanvasProfile(canvas, evaluation.hullGeometry, projectViewState, inputsSnapshot.equipment, evaluation.constraints);
  renderTheoreticalDrawing(theoreticalDrawingCanvas, evaluation.theoreticalDrawing);
  renderEquipment(publication);
  renderTable(tableBody, pointCountEl, evaluation.hullGeometry);
  renderBalanceMetrics(balanceMetrics, evaluation.balance);
  hullScene3d.render(evaluation.hullGeometry, inputsSnapshot.equipment, scene3dSettings, evaluation.constraints);
}

const projectEvaluationRuntime = createProjectEvaluationRuntime({
  derive: deriveProject,
  render: renderPublication,
  onError: (phase, error) => logger.error("project evaluation runtime failed", {
    phase,
    error: error instanceof Error ? error.message : String(error),
  }),
});

function renderCurrentViewsForSize(): void {
  const publication = projectEvaluationRuntime.getPublication();
  if (!publication) {
    hullScene3d.resize();
    return;
  }

  renderCanvasProfile(canvas, publication.evaluation.hullGeometry, projectViewState, publication.inputsSnapshot.equipment, publication.evaluation.constraints);
  renderTheoreticalDrawing(theoreticalDrawingCanvas, publication.evaluation.theoreticalDrawing);
  hullScene3d.resize();
}

function scheduleRenderResize(): void {
  if (resizeFrame !== null) return;
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    renderCurrentViewsForSize();
  });
}

const resizeObserver = typeof ResizeObserver === "undefined"
  ? null
  : new ResizeObserver(() => scheduleRenderResize());

resizeObserver?.observe(canvas);
resizeObserver?.observe(theoreticalDrawingCanvas);
resizeObserver?.observe(scene3dContainer);

for (const details of panelDetails) {
  details.addEventListener("toggle", () => {
    if (details.open) scheduleRenderResize();
  });
}

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

function renderEquipment(publication: ProjectEvaluationPublication): void {
  const focusState = focusedEquipmentField();
  renderEquipmentEditor(equipmentList, publication.inputsSnapshot.equipment, publication.evaluation.constraints);
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

function writeProfileControls(profile: ProjectProfileInputs, view: ProjectViewState): void {
  const profileState = projectProfileInputsWithViewToProfileState(profile, view);
  writeNumericInput(inputs.length, profileState.length);
  writeNumericInput(inputs.breadth, profileState.breadth);
  writeNumericInput(inputs.height, profileState.height);
  writeNumericInput(inputs.slenderness, profileState.slenderness);
  writeNumericInput(inputs.cylindricalInsertLength, profileState.cylindricalInsertLength);
  inputs.geometryMode.value = normalizeGeometryMode(profileState.geometryMode);
  writeGeometryModePresentation(profileState.geometryMode);
  writeIntegerInput(inputs.stations, profileState.stations);
  inputs.showGrid.checked = view.showGrid;
  inputs.showPoints.checked = view.showPoints;
  logger.debug("profile controls written from project json", {
    length: profileState.length,
    geometryMode: normalizeGeometryMode(profileState.geometryMode),
    breadth: profileState.breadth,
    height: profileState.height,
    slenderness: profileState.slenderness,
    stations: profileState.stations,
  });
}

function commitProfileFromControls(source: LastEdited): void {
  const profileState = appState.readState(source);
  const committed = projectStore.setProfile({
    geometryMode: normalizeGeometryMode(profileState.geometryMode),
    length: profileState.length,
    breadth: profileState.breadth,
    height: profileState.height,
    cylindricalInsertLength: profileState.cylindricalInsertLength,
    stations: profileState.stations,
  });
  renderCommittedState(committed);
}

function replaceProjectViewState(view: ProjectViewState): void {
  projectViewState = Object.freeze({ ...view });
}

function applyPreparedProjectImport(result: Extract<PreparedProjectImportResult, { ok: true }>): void {
  replaceProjectViewState(result.view);
  const committed = projectStore.replaceProject(result.inputs);
  logger.debug("projectImportCommitted", {
    migrated: result.migratedFromVersion === 1,
    warningCount: result.warnings.length,
    equipmentCount: committed.equipment.length,
  });

  try {
    appState.setLastEdited("height");
    writeProfileControls(committed.profile, projectViewState);
    writeScene3dControls(scene3dControls, projectViewState.scene3dSettings);
    writeNumericInput(waterDensityInput, committed.balanceSettings.waterDensityKgPerM3);
  } catch (error) {
    logger.error("project json import post-commit controls failed", {
      phase: "postCommitControls",
      error: error instanceof Error ? error.message : String(error),
    });
    window.alert("Проект импортирован, но не удалось обновить элементы управления.");
    return;
  }

  try {
    renderCommittedState(committed);
  } catch (error) {
    window.alert("Проект импортирован, но не удалось обновить отображение.");
  }
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

function renderCommittedState(inputsSnapshot: ProjectInputs): void {
  const profile = projectProfileInputsWithViewToProfileState(inputsSnapshot.profile, projectViewState);
  logger.debug("profile render started", { source: appState.getLastEdited(), equipmentCount: inputsSnapshot.equipment.length });
  writeGeometryModePresentation(profile.geometryMode);
  projectEvaluationRuntime.commit(inputsSnapshot);
}

inputs.length.addEventListener("input", () => commitProfileFromControls(appState.getLastEdited()));
inputs.breadth.addEventListener("input", () => commitProfileFromControls(appState.getLastEdited()));
inputs.slenderness.addEventListener("input", () => commitProfileFromControls("slenderness"));
inputs.height.addEventListener("input", () => commitProfileFromControls("height"));
inputs.cylindricalInsertLength.addEventListener("input", () => commitProfileFromControls(appState.getLastEdited()));
inputs.geometryMode.addEventListener("change", () => commitProfileFromControls(appState.getLastEdited()));
inputs.stations.addEventListener("input", () => commitProfileFromControls(appState.getLastEdited()));
inputs.showGrid.addEventListener("change", () => {
  replaceProjectViewState({ ...projectViewState, showGrid: inputs.showGrid.checked });
  projectEvaluationRuntime.rerender();
});
inputs.showPoints.addEventListener("change", () => {
  replaceProjectViewState({ ...projectViewState, showPoints: inputs.showPoints.checked });
  projectEvaluationRuntime.rerender();
});
waterDensityInput.addEventListener("input", () => {
  const snapshot = projectStore.getSnapshot();
  const committed = projectStore.setBalanceSettings({ ...snapshot.balanceSettings, waterDensityKgPerM3: readWaterDensity(waterDensityInput) });
  renderCommittedState(committed);
});
bindScene3dControls(scene3dControls, () => {
  const publication = projectEvaluationRuntime.getPublication();
  if (!publication) return;
  const scene3dSettings = normalizeScene3dSettings(readScene3dControls(scene3dControls), scene3dBoundsFromSnapshot(publication.evaluation.hullGeometry));
  replaceProjectViewState({ ...projectViewState, scene3dSettings });
  projectEvaluationRuntime.rerender();
});
window.addEventListener("resize", scheduleRenderResize);
window.addEventListener("beforeunload", () => {
  if (resizeFrame !== null) {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = null;
  }
  resizeObserver?.disconnect();
  hullScene3d.dispose();
});

addEquipmentButton.addEventListener("click", () => {
  const equipmentPanel = addEquipmentButton.closest<HTMLDetailsElement>("details");
  if (equipmentPanel) equipmentPanel.open = true;
  const equipment = addEquipmentItem(projectStore.getSnapshot().equipment);
  const committed = projectStore.setEquipment(equipment);
  logger.info("equipment added by user", { count: equipment.length });
  renderCommittedState(committed);
});

equipmentList.addEventListener("click", (event) => {
  if (!isEquipmentDeleteEvent(event)) return;
  const id = equipmentIdFromEvent(event);
  if (!id) return;
  const equipment = deleteEquipmentItem(projectStore.getSnapshot().equipment, id);
  const committed = projectStore.setEquipment(equipment);
  logger.info("equipment deleted by user", { id, count: equipment.length });
  renderCommittedState(committed);
});

equipmentList.addEventListener("change", (event) => {
  const id = equipmentIdFromEvent(event);
  const target = event.target;
  if (!id || !(target instanceof HTMLElement)) return;
  const row = target.closest<HTMLElement>("[data-equipment-id]");
  if (!row) return;
  const previousShape = projectStore.getSnapshot().equipment.find((item) => item.id === id)?.shape;
  const nextShape = row.querySelector<HTMLSelectElement>('[data-field="shape"]')?.value;
  const isShapeChange = target instanceof HTMLSelectElement && target.dataset.field === "shape" && previousShape !== nextShape;
  if (isShapeChange) {
    logger.debug("[FIX] equipment shape change uses default dimensions", { id, previousShape, nextShape });
  }
  const committed = projectStore.setEquipment(updateEquipmentItem(projectStore.getSnapshot().equipment, id, readEquipmentUpdate(row, { includeDimensions: !isShapeChange })));
  renderCommittedState(committed);
});

equipmentList.addEventListener("input", (event) => {
  const id = equipmentIdFromEvent(event);
  const target = event.target;
  if (!id || !(target instanceof HTMLElement) || target instanceof HTMLSelectElement) return;
  const row = target.closest<HTMLElement>("[data-equipment-id]");
  if (!row) return;
  logger.debug("equipment state read from UI", { id });
  const committed = projectStore.setEquipment(updateEquipmentItem(projectStore.getSnapshot().equipment, id, readEquipmentUpdate(row)));
  renderCommittedState(committed);
});

downloadSvgButton.addEventListener("click", () => {
  const publication = projectEvaluationRuntime.getPublication();
  if (publication) download("underwater-vehicle-profile.svg", "image/svg+xml;charset=utf-8", buildSvg(publication.evaluation.hullGeometry));
});

downloadCsvButton.addEventListener("click", () => {
  const publication = projectEvaluationRuntime.getPublication();
  if (publication) download("underwater-vehicle-profile.csv", "text/csv;charset=utf-8", buildCsv(publication.evaluation.hullGeometry));
});

downloadProjectJsonButton.addEventListener("click", () => {
  logger.info("project json export requested", { equipmentCount: projectStore.getSnapshot().equipment.length });
  download(
    "underwater-vehicle-project.json",
    "application/json;charset=utf-8",
    buildProjectJson(inputsAndViewToSerializableProject(projectStore.getSnapshot(), projectViewState)),
  );
});

uploadProjectJsonButton.addEventListener("click", () => {
  logger.debug("project json import file picker requested");
  projectJsonInput.click();
});

projectJsonInput.addEventListener("change", async () => {
  const file = projectJsonInput.files?.[0];
  if (!file) return;
  const requestToken = projectImportRequestToken + 1;
  projectImportRequestToken = requestToken;

  try {
    let json: string;
    try {
      json = await readFileText(file);
    } catch (error) {
      if (requestToken !== projectImportRequestToken) return;
      logger.error("project json import file read failed", {
        phase: "fileRead",
        fileName: file.name,
        error: error instanceof Error ? error.message : String(error),
      });
      window.alert("Не удалось прочитать файл проекта.");
      return;
    }
    if (requestToken !== projectImportRequestToken) return;

    const result = prepareProjectImport(json);
    if (requestToken !== projectImportRequestToken) return;
    if (!result.ok) {
      logger.warn("project json import rejected", { phase: "prepare", fileName: file.name, error: result.error });
      window.alert(result.error);
      return;
    }

    applyPreparedProjectImport(result);
    if (result.warnings.length > 0) {
      logger.warn("project json import completed with normalization warnings", {
        fileName: file.name,
        warningCount: result.warnings.length,
      });
    }
    showProjectImportNotice(result.migratedFromVersion, result.warnings);
    logger.info("project json import completed", { fileName: file.name, equipmentCount: result.inputs.equipment.length });
  } catch (error) {
    logger.error("project json import failed unexpectedly", {
      phase: "prepare",
      fileName: file.name,
      error: error instanceof Error ? error.message : String(error),
    });
    window.alert("Не удалось обработать файл проекта.");
  } finally {
    if (requestToken === projectImportRequestToken) projectJsonInput.value = "";
  }
});

downloadTheoreticalDrawingSvgButton.addEventListener("click", () => {
  const publication = projectEvaluationRuntime.getPublication();
  if (!publication) return;
  logger.info("theoretical drawing exported", { sectionCount: publication.evaluation.theoreticalDrawing.sections.length });
  download("underwater-vehicle-theoretical-drawing.svg", "image/svg+xml;charset=utf-8", buildTheoreticalDrawingSvg(publication.evaluation.theoreticalDrawing));
});

resetButton.addEventListener("click", () => {
  appState.setLastEdited("slenderness");
  replaceProjectViewState({ ...projectViewState, showGrid: true, showPoints: true });
  const defaultProject = createDefaultProjectInputs();
  const committed = projectStore.replaceProject({
    ...defaultProject,
    balanceSettings: { ...defaultProject.balanceSettings, waterDensityKgPerM3: DEFAULT_WATER_DENSITY_KG_PER_M3 },
  });
  writeProfileControls(committed.profile, projectViewState);
  writeScene3dControls(scene3dControls, projectViewState.scene3dSettings);
  waterDensityInput.value = String(DEFAULT_WATER_DENSITY_KG_PER_M3);
  renderCommittedState(committed);
});

try {
  logger.info("application started");
  writeProfileControls(projectStore.getSnapshot().profile, projectViewState);
  writeScene3dControls(scene3dControls, projectViewState.scene3dSettings);
  waterDensityInput.value = String(DEFAULT_WATER_DENSITY_KG_PER_M3);
  renderCommittedState(projectStore.getSnapshot());
} catch (error) {
  logger.error("application initialization failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}
