export interface WorkbenchInteractionState {
  readonly selectedEquipmentId: string | null;
  readonly hoveredEquipmentId: string | null;
}

export function createDefaultInteractionState(): WorkbenchInteractionState {
  return Object.freeze({
    selectedEquipmentId: null,
    hoveredEquipmentId: null,
  });
}

export function selectEquipment(
  state: WorkbenchInteractionState,
  id: string,
): WorkbenchInteractionState {
  if (state.selectedEquipmentId === id) return state;
  return Object.freeze({
    ...state,
    selectedEquipmentId: id,
  });
}

export function clearSelection(
  state: WorkbenchInteractionState,
): WorkbenchInteractionState {
  if (state.selectedEquipmentId === null) return state;
  return Object.freeze({
    ...state,
    selectedEquipmentId: null,
  });
}

export function hoverEquipment(
  state: WorkbenchInteractionState,
  id: string | null,
): WorkbenchInteractionState {
  if (state.hoveredEquipmentId === id) return state;
  return Object.freeze({
    ...state,
    hoveredEquipmentId: id,
  });
}

export function clearHover(
  state: WorkbenchInteractionState,
): WorkbenchInteractionState {
  if (state.hoveredEquipmentId === null) return state;
  return Object.freeze({
    ...state,
    hoveredEquipmentId: null,
  });
}

export function resolveSelectionAfterDelete(
  currentSelectionId: string | null,
  deletedId: string,
  beforeIds: readonly string[],
  afterIds: readonly string[],
): string | null {
  if (currentSelectionId === null || currentSelectionId !== deletedId) {
    return currentSelectionId;
  }
  const deletedIndex = beforeIds.indexOf(deletedId);
  if (deletedIndex === -1) return currentSelectionId;

  if (deletedIndex > 0) {
    const prevId = beforeIds[deletedIndex - 1];
    if (afterIds.includes(prevId)) return prevId;
  }

  if (deletedIndex < beforeIds.length - 1) {
    const nextId = beforeIds[deletedIndex + 1];
    if (afterIds.includes(nextId)) return nextId;
  }

  if (afterIds.length > 0) {
    return afterIds[Math.min(deletedIndex, afterIds.length - 1)];
  }

  return null;
}
