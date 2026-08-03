import type { ProjectCommand } from "./commands";
import type { ProjectInputs } from "./model";
import { cloneProjectInputs } from "./ownership";
import { reduceProject } from "./reducer";

export type ProjectStoreListener = (snapshot: ProjectInputs) => void;

export interface ProjectStore {
  readonly getSnapshot: () => ProjectInputs;
  readonly dispatch: (command: ProjectCommand) => ProjectInputs;
  readonly subscribe: (listener: ProjectStoreListener) => () => void;
}

export function createProjectStore(initialProject: ProjectInputs): ProjectStore {
  let snapshot = cloneProjectInputs(initialProject);
  let isNotifying = false;
  const listeners: ProjectStoreListener[] = [];

  function commit(nextSnapshot: ProjectInputs): ProjectInputs {
    if (nextSnapshot === snapshot) return snapshot;
    if (
      nextSnapshot.profile === snapshot.profile &&
      nextSnapshot.equipment === snapshot.equipment &&
      nextSnapshot.balanceSettings === snapshot.balanceSettings
    ) {
      return snapshot;
    }
    if (isNotifying) throw new Error("ProjectStore does not allow reentrant commits during notification");

    snapshot = nextSnapshot;
    const registrations = [...listeners];
    let listenerError: unknown;
    isNotifying = true;
    try {
      for (const listener of registrations) {
        try {
          listener(snapshot);
        } catch (error) {
          listenerError ??= error;
        }
      }
    } finally {
      isNotifying = false;
    }

    if (listenerError !== undefined) throw listenerError;
    return snapshot;
  }

  const store: ProjectStore = {
    getSnapshot: () => snapshot,
    dispatch: (command: ProjectCommand) => commit(reduceProject(snapshot, command)),
    subscribe: (listener: ProjectStoreListener) => {
      listeners.push(listener);
      let isSubscribed = true;
      return () => {
        if (!isSubscribed) return;
        isSubscribed = false;
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
  return Object.freeze(store);
}
