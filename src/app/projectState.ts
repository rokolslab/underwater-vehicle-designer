import type { ProfileState } from "../modules/geometry/model";
import type { EquipmentItem } from "../modules/equipment/model";
import type { Scene3dSettings } from "../modules/rendering/model";
import { logger } from "../shared/logger";

export interface ProjectState {
  readonly profile: ProfileState;
  readonly equipment: readonly EquipmentItem[];
  readonly scene3dSettings: Scene3dSettings;
}

export function makeProjectState(
  profile: ProfileState,
  equipment: readonly EquipmentItem[],
  scene3dSettings: Scene3dSettings,
): ProjectState {
  const state = Object.freeze({
    profile,
    equipment: Object.freeze([...equipment]),
    scene3dSettings,
  });
  logger.debug("project state assembled", {
    equipmentCount: state.equipment.length,
    scene3dMode: state.scene3dSettings.mode,
  });
  return state;
}
