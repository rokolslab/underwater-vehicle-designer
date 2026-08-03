import type { ProjectInputs } from "../application/project/model";
import { parseProjectJson } from "../modules/persistence/project-json";
import { serializableProjectToInputsAndView, type ProjectViewState } from "./projectProjection";

export type PreparedProjectImportResult =
  | {
      readonly ok: true;
      readonly inputs: ProjectInputs;
      readonly view: ProjectViewState;
      readonly warnings: readonly string[];
      readonly migratedFromVersion?: 1;
    }
  | { readonly ok: false; readonly error: string; readonly warnings: readonly string[] };

export function prepareProjectImport(json: string): PreparedProjectImportResult {
  const parsed = parseProjectJson(json);
  if (!parsed.ok) return parsed;

  const prepared = serializableProjectToInputsAndView(parsed.project);
  return Object.freeze({
    ok: true,
    inputs: prepared.inputs,
    view: prepared.view,
    warnings: parsed.warnings,
    ...(parsed.migratedFromVersion === undefined ? {} : { migratedFromVersion: parsed.migratedFromVersion }),
  });
}
