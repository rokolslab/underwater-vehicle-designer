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
  elements.sectionX.max = String(totalLength);
  elements.sectionOffset.min = String(-maxRadius);
  elements.sectionOffset.max = String(maxRadius);
  logger.debug("3d control bounds updated", { totalLength, maxRadius });
}
