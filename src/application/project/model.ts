import type { BalanceSettings } from "../../modules/balance/model";
import type { EquipmentItem } from "../../modules/equipment/model";
import type { GeometryMode } from "../../modules/geometry/model";

export interface ProjectProfileInputs {
  readonly geometryMode: GeometryMode;
  readonly length: number;
  readonly breadth: number;
  readonly height: number;
  readonly cylindricalInsertLength: number;
  readonly stations: number;
}

export interface ProjectInputs {
  readonly profile: ProjectProfileInputs;
  readonly equipment: readonly EquipmentItem[];
  readonly balanceSettings: BalanceSettings;
}
