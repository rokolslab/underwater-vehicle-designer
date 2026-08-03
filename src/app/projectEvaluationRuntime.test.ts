import { describe, expect, it, vi } from "vitest";
import { createDefaultProjectInputs } from "../application/project/defaults";
import type { ProjectEvaluation } from "../application/project/model";
import { createProjectStore } from "../application/project/store";
import { createProjectEvaluationRuntime } from "./projectEvaluationRuntime";

function evaluation(id: number): ProjectEvaluation {
  return { id } as unknown as ProjectEvaluation;
}

describe("project evaluation runtime", () => {
  it("publishes inputs and evaluation atomically after derive succeeds", () => {
    const inputs = createDefaultProjectInputs();
    const render = vi.fn();
    const runtime = createProjectEvaluationRuntime({ derive: () => evaluation(1), render });

    const publication = runtime.commit(inputs);

    expect(publication).toEqual({ inputsSnapshot: inputs, evaluation: evaluation(1) });
    expect(runtime.getPublication()).toBe(publication);
    expect(render).toHaveBeenCalledWith(publication);
  });

  it("keeps the previous publication when derive fails", () => {
    const inputs = createDefaultProjectInputs();
    const previousEvaluation = evaluation(1);
    const error = new Error("derive failed");
    const onError = vi.fn();
    const runtime = createProjectEvaluationRuntime({
      derive: vi.fn().mockReturnValueOnce(previousEvaluation).mockImplementationOnce(() => { throw error; }),
      render: vi.fn(),
      onError,
    });
    const previous = runtime.commit(inputs);

    expect(() => runtime.commit(inputs)).toThrow(error);
    expect(runtime.getPublication()).toBe(previous);
    expect(onError).toHaveBeenCalledWith("derive", error);
  });

  it("publishes the new pair before render failure", () => {
    const inputs = createDefaultProjectInputs();
    const error = new Error("render failed");
    const runtime = createProjectEvaluationRuntime({
      derive: () => evaluation(2),
      render: () => { throw error; },
    });

    expect(() => runtime.commit(inputs)).toThrow(error);
    expect(runtime.getPublication()?.evaluation).toEqual(evaluation(2));
  });

  it("rerenders the current publication without derivation", () => {
    const inputs = createDefaultProjectInputs();
    const derive = vi.fn(() => evaluation(1));
    const render = vi.fn();
    const runtime = createProjectEvaluationRuntime({ derive, render });
    const publication = runtime.commit(inputs);

    expect(runtime.rerender()).toBe(publication);
    expect(derive).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(2);
  });

  it("derives for canonical store commits and not for view-only rerenders", () => {
    const store = createProjectStore(createDefaultProjectInputs());
    const derive = vi.fn(() => evaluation(1));
    const runtime = createProjectEvaluationRuntime({ derive, render: vi.fn() });

    function dispatchAndCommit(command: Parameters<typeof store.dispatch>[0]): void {
      const before = store.getSnapshot();
      const committed = store.dispatch(command);
      if (committed !== before) runtime.commit(committed);
    }

    runtime.commit(store.getSnapshot());
    runtime.rerender();
    dispatchAndCommit({ type: "ReplaceProfile", profile: { ...store.getSnapshot().profile, length: 7 } });
    dispatchAndCommit({ type: "UpdateEquipment", id: "missing", update: { name: "No-op" } });
    dispatchAndCommit({
      type: "ReplaceBalanceSettings",
      balanceSettings: { ...store.getSnapshot().balanceSettings, waterDensityKgPerM3: 997 },
    });

    expect(derive).toHaveBeenCalledTimes(3);
  });
});
