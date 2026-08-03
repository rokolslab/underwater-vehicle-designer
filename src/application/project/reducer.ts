import { addEquipmentItem, deleteEquipmentItem, updateEquipmentItem } from "../../modules/equipment/placement-core";
import type { ProjectCommand } from "./commands";
import type { ProjectInputs } from "./model";
import {
  cloneBalanceSettings,
  cloneEquipment,
  cloneProjectProfileInputs,
  makeProjectInputsSnapshot,
} from "./ownership";

function assertNever(command: never): never {
  throw new Error(`Unsupported project command: ${JSON.stringify(command)}`);
}

export function reduceProject(state: ProjectInputs, command: ProjectCommand): ProjectInputs {
  switch (command.type) {
    case "ReplaceProfile": {
      if (command.profile === state.profile) return state;
      return makeProjectInputsSnapshot(cloneProjectProfileInputs(command.profile), state.equipment, state.balanceSettings);
    }
    case "AddEquipment": {
      const requestedId = command.requestedId;
      const equipment = addEquipmentItem(state.equipment, {
        idFactory: requestedId === undefined ? undefined : () => requestedId,
        shape: command.shape,
        name: command.name,
      });
      return makeProjectInputsSnapshot(state.profile, equipment, state.balanceSettings);
    }
    case "UpdateEquipment": {
      const equipment = updateEquipmentItem(state.equipment, command.id, command.update);
      if (equipment === state.equipment) return state;
      return makeProjectInputsSnapshot(state.profile, equipment, state.balanceSettings);
    }
    case "DeleteEquipment": {
      const equipment = deleteEquipmentItem(state.equipment, command.id);
      if (equipment === state.equipment) return state;
      return makeProjectInputsSnapshot(state.profile, equipment, state.balanceSettings);
    }
    case "ReplaceBalanceSettings": {
      if (command.balanceSettings === state.balanceSettings) return state;
      return makeProjectInputsSnapshot(state.profile, state.equipment, cloneBalanceSettings(command.balanceSettings));
    }
    case "ReplaceProject": {
      if (command.project === state) return state;
      if (
        command.project.profile === state.profile &&
        command.project.equipment === state.equipment &&
        command.project.balanceSettings === state.balanceSettings
      ) {
        return state;
      }
      return makeProjectInputsSnapshot(
        command.project.profile === state.profile ? state.profile : cloneProjectProfileInputs(command.project.profile),
        command.project.equipment === state.equipment ? state.equipment : cloneEquipment(command.project.equipment),
        command.project.balanceSettings === state.balanceSettings
          ? state.balanceSettings
          : cloneBalanceSettings(command.project.balanceSettings),
      );
    }
    default:
      return assertNever(command);
  }
}
