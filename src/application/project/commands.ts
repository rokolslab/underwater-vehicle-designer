import type { BalanceSettings } from "../../modules/balance/model";
import type { EquipmentShape } from "../../modules/equipment/model";
import type { EquipmentUpdate } from "../../modules/equipment/placement-core";
import type { ProjectInputs, ProjectProfileInputs } from "./model";

export type ProjectCommand =
  | {
      readonly type: "ReplaceProfile";
      readonly profile: ProjectProfileInputs;
    }
  | {
      readonly type: "AddEquipment";
      readonly requestedId?: string;
      readonly shape?: EquipmentShape;
      readonly name?: string;
    }
  | {
      readonly type: "UpdateEquipment";
      readonly id: string;
      readonly update: EquipmentUpdate;
    }
  | {
      readonly type: "DeleteEquipment";
      readonly id: string;
    }
  | {
      readonly type: "ReplaceBalanceSettings";
      readonly balanceSettings: BalanceSettings;
    }
  | {
      readonly type: "ReplaceProject";
      readonly project: ProjectInputs;
    };

export type { EquipmentUpdate };
