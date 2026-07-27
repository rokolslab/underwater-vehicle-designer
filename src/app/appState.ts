import { defaultGeometryMode, normalizeGeometryMode, type ProfileState } from "../modules/geometry/model";
import { clampNumber } from "../shared/math";
import { logger } from "../shared/logger";
import type { ControlElements } from "../modules/ui/controls";
import { writeIntegerInput, writeNumericInput } from "../modules/ui/controls";

export type LastEdited = "slenderness" | "height";

const defaults = {
  geometryMode: defaultGeometryMode,
  length: 6,
  breadth: 2,
  slenderness: 3,
  cylindricalInsertLength: 0,
  stations: 20,
};

export interface AppStateController {
  readonly readState: (source?: LastEdited) => ProfileState;
  readonly reset: () => ProfileState;
  readonly getLastEdited: () => LastEdited;
}

export function createAppStateController(inputs: ControlElements): AppStateController {
  let lastEdited: LastEdited = "slenderness";

  function readState(source: LastEdited = lastEdited): ProfileState {
    lastEdited = source;
    const length = clampNumber(inputs.length.value, defaults.length, 0.1);
    const breadth = clampNumber(inputs.breadth.value, defaults.breadth, 0.01);
    let slenderness = clampNumber(inputs.slenderness.value, defaults.slenderness, 0.1);
    let height = clampNumber(inputs.height.value, length / slenderness, 0.01);
    const maxCylindricalInsertLength = length / 2;
    const requestedCylindricalInsertLength = Number(inputs.cylindricalInsertLength.value);
    const geometryMode = normalizeGeometryMode(inputs.geometryMode.value);
    const cylindricalInsertLength = clampNumber(
      inputs.cylindricalInsertLength.value,
      defaults.cylindricalInsertLength,
      0,
      maxCylindricalInsertLength,
    );

    if (
      Number.isFinite(requestedCylindricalInsertLength) &&
      requestedCylindricalInsertLength !== cylindricalInsertLength
    ) {
      logger.warn("[FIX] cylindrical insert length clamped", {
        requested: requestedCylindricalInsertLength,
        normalized: cylindricalInsertLength,
        max: maxCylindricalInsertLength,
      });
    }

    if (lastEdited === "height") {
      slenderness = length / height;
      writeNumericInput(inputs.slenderness, slenderness);
    } else {
      height = length / slenderness;
      writeNumericInput(inputs.height, height);
    }

    const stations = Math.round(clampNumber(inputs.stations.value, defaults.stations, 8, 80));
    writeNumericInput(inputs.length, length);
    writeNumericInput(inputs.breadth, breadth);
    inputs.geometryMode.value = geometryMode;
    inputs.cylindricalInsertLength.max = String(maxCylindricalInsertLength);
    writeNumericInput(inputs.cylindricalInsertLength, cylindricalInsertLength);
    writeIntegerInput(inputs.stations, stations);

    const state = {
      geometryMode,
      length,
      breadth,
      height,
      slenderness,
      diameter: height,
      cylindricalInsertLength,
      stations,
      showGrid: inputs.showGrid.checked,
      showPoints: inputs.showPoints.checked,
    };
    logger.debug("app state normalized", { source: lastEdited, state });
    return state;
  }

  function reset(): ProfileState {
    logger.debug("app state reset");
    inputs.length.value = String(defaults.length);
    inputs.breadth.value = String(defaults.breadth);
    inputs.slenderness.value = String(defaults.slenderness);
    inputs.height.value = String(defaults.length / defaults.slenderness);
    inputs.cylindricalInsertLength.value = String(defaults.cylindricalInsertLength);
    inputs.geometryMode.value = defaults.geometryMode;
    inputs.stations.value = String(defaults.stations);
    inputs.showGrid.checked = true;
    inputs.showPoints.checked = true;
    lastEdited = "slenderness";
    return readState("slenderness");
  }

  return {
    readState,
    reset,
    getLastEdited: () => lastEdited,
  };
}
