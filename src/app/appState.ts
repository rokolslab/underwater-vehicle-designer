import type { ProfileState } from "../modules/geometry/model";
import { clampNumber } from "../shared/math";
import { logger } from "../shared/logger";
import type { ControlElements } from "../modules/ui/controls";
import { writeIntegerInput, writeNumericInput } from "../modules/ui/controls";

export type LastEdited = "slenderness" | "diameter";

const defaults = {
  length: 6,
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
    let slenderness = clampNumber(inputs.slenderness.value, defaults.slenderness, 0.1);
    let diameter = clampNumber(inputs.diameter.value, length / slenderness, 0.01);
    const cylindricalInsertLength = clampNumber(
      inputs.cylindricalInsertLength.value,
      defaults.cylindricalInsertLength,
      0,
    );

    if (lastEdited === "diameter") {
      slenderness = length / diameter;
      writeNumericInput(inputs.slenderness, slenderness);
    } else {
      diameter = length / slenderness;
      writeNumericInput(inputs.diameter, diameter);
    }

    const stations = Math.round(clampNumber(inputs.stations.value, defaults.stations, 8, 80));
    writeNumericInput(inputs.length, length);
    writeNumericInput(inputs.cylindricalInsertLength, cylindricalInsertLength);
    writeIntegerInput(inputs.stations, stations);

    const state = {
      length,
      slenderness,
      diameter,
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
    inputs.slenderness.value = String(defaults.slenderness);
    inputs.cylindricalInsertLength.value = String(defaults.cylindricalInsertLength);
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