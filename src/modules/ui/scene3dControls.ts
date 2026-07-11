import type { Scene3dSettings } from "../rendering/model";
import type { Scene3dSettingsInput } from "../rendering/viewSettings";
import { logger } from "../../shared/logger";

export interface Scene3dControlElements {
  readonly mode: HTMLSelectElement;
  readonly opacity: HTMLInputElement;
  readonly sectionType: HTMLSelectElement;
  readonly sectionX: HTMLInputElement;
  readonly sectionPlane: HTMLSelectElement;
  readonly sectionOffset: HTMLInputElement;
}

export function readScene3dControls(elements: Scene3dControlElements): Scene3dSettingsInput {
  const input = {
    mode: elements.mode.value,
    hullOpacity: elements.opacity.value,
    section: {
      type: elements.sectionType.value,
      x: elements.sectionX.value,
      plane: elements.sectionPlane.value,
      offset: elements.sectionOffset.value,
    },
  };
  logger.debug("3d controls read", {
    mode: input.mode,
    sectionType: input.section.type,
    hullOpacity: input.hullOpacity,
  });
  return input;
}

export function writeScene3dControls(elements: Scene3dControlElements, settings: Scene3dSettings): void {
  elements.mode.value = settings.mode;
  elements.opacity.value = String(settings.hullOpacity);
  elements.sectionType.value = settings.section.type;

  if (settings.section.type === "crossSectionX") {
    elements.sectionX.value = String(settings.section.x);
    elements.sectionPlane.value = "xy";
    elements.sectionOffset.value = "0";
  } else if (settings.section.type === "longitudinalPlane") {
    elements.sectionX.value = "0";
    elements.sectionPlane.value = settings.section.plane;
    elements.sectionOffset.value = String(settings.section.offset);
  } else {
    elements.sectionX.value = "0";
    elements.sectionPlane.value = "xy";
    elements.sectionOffset.value = "0";
  }

  logger.debug("3d controls written", {
    mode: settings.mode,
    sectionType: settings.section.type,
    hullOpacity: settings.hullOpacity,
  });
}

export function bindScene3dControls(elements: Scene3dControlElements, onChange: () => void): void {
  logger.debug("3d controls binding started");
  for (const element of Object.values(elements)) {
    element.addEventListener("input", onChange);
    element.addEventListener("change", onChange);
  }
  logger.debug("3d controls binding completed", { count: Object.values(elements).length });
}

export function updateScene3dControlBounds(
  elements: Scene3dControlElements,
  totalLength: number,
  maxRadius: number,
): void {
  const halfLength = totalLength / 2;
  elements.sectionX.min = String(-halfLength);
  elements.sectionX.max = String(halfLength);
  elements.sectionOffset.min = String(-maxRadius);
  elements.sectionOffset.max = String(maxRadius);
  logger.debug("3d body section control bounds updated", {
    sourceFrame: "Body/SNAME-NED",
    minBodyX: -halfLength,
    maxBodyX: halfLength,
    maxRadius,
  });
}
