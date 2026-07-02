import type { BalanceSettings } from "../modules/balance/model";
import type { ProfileState } from "../modules/geometry/model";
import type { EquipmentItem } from "../modules/equipment/model";
import type { Scene3dSettings } from "../modules/rendering/model";
import { logger } from "../shared/logger";

export interface ProjectState {
  readonly profile: ProfileState;
  readonly equipment: readonly EquipmentItem[];
  readonly scene3dSettings: Scene3dSettings;
  readonly balanceSettings: BalanceSettings;
}

export function makeProjectState(
  profile: ProfileState,
  equipment: readonly EquipmentItem[],
  scene3dSettings: Scene3dSettings,
  balanceSettings: BalanceSettings,
): ProjectState {
  const state = Object.freeze({
    profile,
    equipment: Object.freeze([...equipment]),
    scene3dSettings,
    balanceSettings,
  });
  logger.debug("project state assembled", {
    equipmentCount: state.equipment.length,
    scene3dMode: state.scene3dSettings.mode,
    waterDensityKgPerM3: state.balanceSettings.waterDensityKgPerM3,
  });
  return state;
}
