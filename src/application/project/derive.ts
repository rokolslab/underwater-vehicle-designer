import { calculateEquipmentBalance } from "../../modules/balance/equipment-balance";
import { evaluateEquipmentConstraints } from "../../modules/equipment/constraints";
import { makeProfileSnapshot } from "../../modules/geometry/profile";
import { makeTheoreticalDrawing } from "../../modules/geometry/theoretical-drawing";
import { projectProfileInputsToGeometryProfileState } from "./normalize";
import type { ProjectEvaluation, ProjectInputs } from "./model";

export function deriveProject(inputs: ProjectInputs): ProjectEvaluation {
  const hullGeometry = makeProfileSnapshot(projectProfileInputsToGeometryProfileState(inputs.profile));
  const theoreticalDrawing = makeTheoreticalDrawing(hullGeometry);
  const constraints = evaluateEquipmentConstraints(hullGeometry, inputs.equipment);
  const balance = calculateEquipmentBalance({
    equipment: inputs.equipment,
    waterDensityKgPerM3: inputs.balanceSettings.waterDensityKgPerM3,
    gravityMPerS2: inputs.balanceSettings.gravityMPerS2,
  });

  return Object.freeze({
    hullGeometry,
    theoreticalDrawing,
    constraints,
    balance,
  });
}
