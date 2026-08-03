import type { ProjectEvaluation, ProjectInputs } from "../application/project/model";

export interface ProjectEvaluationPublication {
  readonly inputsSnapshot: ProjectInputs;
  readonly evaluation: ProjectEvaluation;
}

export type ProjectEvaluationRuntimePhase = "derive" | "render";

export interface ProjectEvaluationRuntimeOptions {
  readonly derive: (inputs: ProjectInputs) => ProjectEvaluation;
  readonly render: (publication: ProjectEvaluationPublication) => void;
  readonly onError?: (phase: ProjectEvaluationRuntimePhase, error: unknown) => void;
}

export interface ProjectEvaluationRuntime {
  readonly getPublication: () => ProjectEvaluationPublication | undefined;
  readonly commit: (inputsSnapshot: ProjectInputs) => ProjectEvaluationPublication;
  readonly rerender: () => ProjectEvaluationPublication | undefined;
}

export function createProjectEvaluationRuntime(options: ProjectEvaluationRuntimeOptions): ProjectEvaluationRuntime {
  let publication: ProjectEvaluationPublication | undefined;

  function render(nextPublication: ProjectEvaluationPublication): void {
    try {
      options.render(nextPublication);
    } catch (error) {
      options.onError?.("render", error);
      throw error;
    }
  }

  return Object.freeze({
    getPublication: () => publication,
    commit(inputsSnapshot: ProjectInputs): ProjectEvaluationPublication {
      let evaluation: ProjectEvaluation;
      try {
        evaluation = options.derive(inputsSnapshot);
      } catch (error) {
        options.onError?.("derive", error);
        throw error;
      }

      const nextPublication = Object.freeze({ inputsSnapshot, evaluation });
      publication = nextPublication;
      render(nextPublication);
      return nextPublication;
    },
    rerender(): ProjectEvaluationPublication | undefined {
      if (!publication) return undefined;
      render(publication);
      return publication;
    },
  });
}
