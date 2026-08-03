import { DEFAULT_GRAVITY_M_PER_S2, DEFAULT_WATER_DENSITY_KG_PER_M3 } from "../../modules/balance/equipment-balance";
import { defaultGeometryMode } from "../../modules/geometry/model";
import type { ProjectInputs } from "./model";

export const DEFAULT_PROJECT_PROFILE_INPUTS = Object.freeze({
  geometryMode: defaultGeometryMode,
  length: 6,
  breadth: 2,
  height: 2,
  cylindricalInsertLength: 0,
  stations: 20,
});

export const DEFAULT_PROJECT_BALANCE_SETTINGS = Object.freeze({
  waterDensityKgPerM3: DEFAULT_WATER_DENSITY_KG_PER_M3,
  gravityMPerS2: DEFAULT_GRAVITY_M_PER_S2,
});

export function createDefaultProjectInputs(): ProjectInputs {
  return Object.freeze({
    profile: Object.freeze({ ...DEFAULT_PROJECT_PROFILE_INPUTS }),
    equipment: Object.freeze([]),
    balanceSettings: Object.freeze({ ...DEFAULT_PROJECT_BALANCE_SETTINGS }),
  });
}
