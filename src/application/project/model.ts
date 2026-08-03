import type { BalanceSettings } from "../../modules/balance/model";
import type { EquipmentBalanceResult } from "../../modules/balance/model";
import type { EquipmentConstraintReport } from "../../modules/equipment/constraints";
import type { EquipmentItem } from "../../modules/equipment/model";
import type { GeometryMode, ProfileSnapshot } from "../../modules/geometry/model";
import type { TheoreticalDrawing } from "../../modules/geometry/theoretical-drawing";

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

export interface ProjectEvaluation {
  readonly hullGeometry: ProfileSnapshot;
  readonly theoreticalDrawing: TheoreticalDrawing;
  readonly constraints: EquipmentConstraintReport;
  readonly balance: EquipmentBalanceResult;
}
