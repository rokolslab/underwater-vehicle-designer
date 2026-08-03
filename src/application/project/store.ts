import type { BalanceSettings } from "../../modules/balance/model";
import type { EquipmentItem } from "../../modules/equipment/model";
import type { ProjectInputs, ProjectProfileInputs } from "./model";

export type ProjectStoreListener = (snapshot: ProjectInputs) => void;

export interface ProjectStore {
  readonly getSnapshot: () => ProjectInputs;
  readonly setProfile: (profile: ProjectProfileInputs) => ProjectInputs;
  readonly setEquipment: (equipment: readonly EquipmentItem[]) => ProjectInputs;
  readonly setBalanceSettings: (balanceSettings: BalanceSettings) => ProjectInputs;
  readonly replaceProject: (project: ProjectInputs) => ProjectInputs;
  readonly subscribe: (listener: ProjectStoreListener) => () => void;
}

function cloneProfile(profile: ProjectProfileInputs): ProjectProfileInputs {
  return Object.freeze({ ...profile });
}

function cloneBalanceSettings(balanceSettings: BalanceSettings): BalanceSettings {
  return Object.freeze({ ...balanceSettings });
}

function cloneEquipmentItem(item: EquipmentItem): EquipmentItem {
  const base = {
    id: item.id,
    name: item.name,
    shape: item.shape,
    massKg: item.massKg,
    position: Object.freeze({ ...item.position }),
    orientation: item.orientation,
    displacedVolume: item.displacedVolume,
  };

  if (item.shape === "sphere") {
    return Object.freeze({ ...base, shape: item.shape, dimensions: Object.freeze({ ...item.dimensions }) });
  }

  if (item.shape === "cylinder") {
    return Object.freeze({ ...base, shape: item.shape, dimensions: Object.freeze({ ...item.dimensions }) });
  }

  return Object.freeze({ ...base, shape: item.shape, dimensions: Object.freeze({ ...item.dimensions }) });
}

function cloneEquipment(equipment: readonly EquipmentItem[]): readonly EquipmentItem[] {
  return Object.freeze(equipment.map(cloneEquipmentItem));
}

function makeSnapshot(
  profile: ProjectProfileInputs,
  equipment: readonly EquipmentItem[],
  balanceSettings: BalanceSettings,
): ProjectInputs {
  return Object.freeze({ profile, equipment, balanceSettings });
}

export function createProjectStore(initialProject: ProjectInputs): ProjectStore {
  let snapshot = makeSnapshot(
    cloneProfile(initialProject.profile),
    cloneEquipment(initialProject.equipment),
    cloneBalanceSettings(initialProject.balanceSettings),
  );
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
    setProfile: (profile: ProjectProfileInputs) => {
      if (profile === snapshot.profile) return snapshot;
      return commit(makeSnapshot(cloneProfile(profile), snapshot.equipment, snapshot.balanceSettings));
    },
    setEquipment: (equipment: readonly EquipmentItem[]) => {
      if (equipment === snapshot.equipment) return snapshot;
      return commit(makeSnapshot(snapshot.profile, cloneEquipment(equipment), snapshot.balanceSettings));
    },
    setBalanceSettings: (balanceSettings: BalanceSettings) => {
      if (balanceSettings === snapshot.balanceSettings) return snapshot;
      return commit(makeSnapshot(snapshot.profile, snapshot.equipment, cloneBalanceSettings(balanceSettings)));
    },
    replaceProject: (project: ProjectInputs) => {
      if (project === snapshot) return snapshot;
      return commit(
        makeSnapshot(
          project.profile === snapshot.profile ? snapshot.profile : cloneProfile(project.profile),
          project.equipment === snapshot.equipment ? snapshot.equipment : cloneEquipment(project.equipment),
          project.balanceSettings === snapshot.balanceSettings
            ? snapshot.balanceSettings
            : cloneBalanceSettings(project.balanceSettings),
        ),
      );
    },
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
