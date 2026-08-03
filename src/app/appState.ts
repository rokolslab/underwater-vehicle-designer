import type { ProfileState } from "../modules/geometry/model";
import { DEFAULT_PROJECT_PROFILE_INPUTS } from "../application/project/defaults";
import { normalizeProjectProfileInputs, projectProfileInputsToProfileState } from "../application/project/normalize";
import { logger } from "../shared/logger";
import type { ControlElements } from "../modules/ui/controls";
import { writeIntegerInput, writeNumericInput } from "../modules/ui/controls";

export type LastEdited = "slenderness" | "height";

const defaultSlenderness = DEFAULT_PROJECT_PROFILE_INPUTS.length / DEFAULT_PROJECT_PROFILE_INPUTS.height;

export interface AppStateController {
  readonly readState: (source?: LastEdited) => ProfileState;
  readonly reset: () => ProfileState;
  readonly getLastEdited: () => LastEdited;
  readonly setLastEdited: (source: LastEdited) => void;
}

export function createAppStateController(inputs: ControlElements): AppStateController {
  let lastEdited: LastEdited = "slenderness";

  function readState(source: LastEdited = lastEdited): ProfileState {
    lastEdited = source;
    const requestedCylindricalInsertLength = Number(inputs.cylindricalInsertLength.value);
    const result = normalizeProjectProfileInputs(
      {
        geometryMode: inputs.geometryMode.value,
        length: inputs.length.value,
        breadth: inputs.breadth.value,
        height: inputs.height.value,
        slenderness: inputs.slenderness.value,
        cylindricalInsertLength: inputs.cylindricalInsertLength.value,
        stations: inputs.stations.value,
      },
      lastEdited === "height" ? "interactive-height" : "interactive-slenderness",
    );
    const { profile } = result;
    const maxCylindricalInsertLength = profile.length / 2;

    if (
      Number.isFinite(requestedCylindricalInsertLength) &&
      requestedCylindricalInsertLength !== profile.cylindricalInsertLength
    ) {
      logger.warn("[FIX] cylindrical insert length clamped", {
        requested: requestedCylindricalInsertLength,
        normalized: profile.cylindricalInsertLength,
        max: maxCylindricalInsertLength,
      });
    }

    if (lastEdited === "height") {
      writeNumericInput(inputs.slenderness, result.slenderness);
    } else {
      writeNumericInput(inputs.height, profile.height);
    }

    writeNumericInput(inputs.length, profile.length);
    writeNumericInput(inputs.breadth, profile.breadth);
    inputs.geometryMode.value = profile.geometryMode;
    inputs.cylindricalInsertLength.max = String(maxCylindricalInsertLength);
    writeNumericInput(inputs.cylindricalInsertLength, profile.cylindricalInsertLength);
    writeIntegerInput(inputs.stations, profile.stations);

    const state = projectProfileInputsToProfileState(result, {
      showGrid: inputs.showGrid.checked,
      showPoints: inputs.showPoints.checked,
    });
    logger.debug("app state normalized", { source: lastEdited, state });
    return state;
  }

  function reset(): ProfileState {
    logger.debug("app state reset");
    inputs.length.value = String(DEFAULT_PROJECT_PROFILE_INPUTS.length);
    inputs.breadth.value = String(DEFAULT_PROJECT_PROFILE_INPUTS.breadth);
    inputs.slenderness.value = String(defaultSlenderness);
    inputs.height.value = String(DEFAULT_PROJECT_PROFILE_INPUTS.height);
    inputs.cylindricalInsertLength.value = String(DEFAULT_PROJECT_PROFILE_INPUTS.cylindricalInsertLength);
    inputs.geometryMode.value = DEFAULT_PROJECT_PROFILE_INPUTS.geometryMode;
    inputs.stations.value = String(DEFAULT_PROJECT_PROFILE_INPUTS.stations);
    inputs.showGrid.checked = true;
    inputs.showPoints.checked = true;
    lastEdited = "slenderness";
    return readState("slenderness");
  }

  return {
    readState,
    reset,
    getLastEdited: () => lastEdited,
    setLastEdited: (source) => {
      lastEdited = source;
    },
  };
}
