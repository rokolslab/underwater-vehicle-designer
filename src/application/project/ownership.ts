import type { BalanceSettings } from "../../modules/balance/model";
import type { EquipmentItem } from "../../modules/equipment/model";
import type { ProjectInputs, ProjectProfileInputs } from "./model";

export function cloneProjectProfileInputs(profile: ProjectProfileInputs): ProjectProfileInputs {
  return Object.freeze({ ...profile });
}

export function cloneBalanceSettings(balanceSettings: BalanceSettings): BalanceSettings {
  return Object.freeze({ ...balanceSettings });
}

export function cloneEquipmentItem(item: EquipmentItem): EquipmentItem {
  const base = {
    id: item.id,
    name: item.name,
    shape: item.shape,
    massKg: item.massKg,
    position: Object.freeze({ ...item.position }),
    orientation: item.orientation,
    ...(item.displacedVolume === undefined ? {} : { displacedVolume: item.displacedVolume }),
  };

  if (item.shape === "sphere") {
    return Object.freeze({ ...base, shape: item.shape, dimensions: Object.freeze({ ...item.dimensions }) });
  }

  if (item.shape === "cylinder") {
    return Object.freeze({ ...base, shape: item.shape, dimensions: Object.freeze({ ...item.dimensions }) });
  }

  return Object.freeze({ ...base, shape: item.shape, dimensions: Object.freeze({ ...item.dimensions }) });
}

export function cloneEquipment(equipment: readonly EquipmentItem[]): readonly EquipmentItem[] {
  return Object.freeze(equipment.map(cloneEquipmentItem));
}

export function makeProjectInputsSnapshot(
  profile: ProjectProfileInputs,
  equipment: readonly EquipmentItem[],
  balanceSettings: BalanceSettings,
): ProjectInputs {
  return Object.freeze({ profile, equipment, balanceSettings });
}

export function cloneProjectInputs(project: ProjectInputs): ProjectInputs {
  return makeProjectInputsSnapshot(
    cloneProjectProfileInputs(project.profile),
    cloneEquipment(project.equipment),
    cloneBalanceSettings(project.balanceSettings),
  );
}
