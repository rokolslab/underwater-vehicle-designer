import type { ProjectInputs, ProjectProfileInputs } from "../application/project/model";
import { projectProfileInputsWithViewToProfileState } from "../application/project/normalize";
import { normalizeGeometryMode } from "../modules/geometry/model";
import type { SerializableProjectState } from "../modules/persistence/project-json";
import type { Scene3dSettings } from "../modules/rendering/model";

export interface ProjectViewState {
  readonly showGrid: boolean;
  readonly showPoints: boolean;
  readonly scene3dSettings: Scene3dSettings;
}

function projectProfileFromSerializable(project: SerializableProjectState): ProjectProfileInputs {
  return Object.freeze({
    geometryMode: normalizeGeometryMode(project.profile.geometryMode),
    length: project.profile.length,
    breadth: project.profile.breadth,
    height: project.profile.height,
    cylindricalInsertLength: project.profile.cylindricalInsertLength,
    stations: project.profile.stations,
  });
}

export function serializableProjectToInputsAndView(project: SerializableProjectState): {
  readonly inputs: ProjectInputs;
  readonly view: ProjectViewState;
} {
  const inputs = Object.freeze({
    profile: projectProfileFromSerializable(project),
    equipment: Object.freeze([...project.equipment]),
    balanceSettings: Object.freeze({ ...project.balanceSettings }),
  });
  const view = Object.freeze({
    showGrid: project.profile.showGrid,
    showPoints: project.profile.showPoints,
    scene3dSettings: project.scene3dSettings,
  });

  return Object.freeze({ inputs, view });
}

export function inputsAndViewToSerializableProject(
  inputs: ProjectInputs,
  view: ProjectViewState,
): SerializableProjectState {
  return Object.freeze({
    profile: projectProfileInputsWithViewToProfileState(inputs.profile, view),
    equipment: Object.freeze([...inputs.equipment]),
    scene3dSettings: view.scene3dSettings,
    balanceSettings: Object.freeze({ ...inputs.balanceSettings }),
  });
}
