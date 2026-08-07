# Implementation Plan: UX-2 Equipment Selection And Diagnostics

Branch: feature/ux-2-equipment-selection-diagnostics
Created: 2026-08-06
Refined: 2026-08-06

## Original Request

связать оборудование, инспектор и диагностику в единый рабочий сценарий

План должен учесть зафиксированное решение из ROADMAP: selection/hover не входят в ProjectInputs, ProjectEvaluation и project JSON, не создают dirty state, не запускают deriveProject(); после добавления выбирается новый объект, после импорта/reset selection очищается, после удаления — ближайший оставшийся объект или empty state.

## Settings

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "Связать оборудование, инспектор и диагностику в единый рабочий сценарий"
Rationale: вторая продуктовая веха UI-трека после завершённого UX-1 workbench shell; selection и diagnostics должны дать пользователю единый рабочий сценарий выбора, инспекции и навигации по проблемам оборудования без загрязнения инженерного state.

## Scope Guardrails

- `WorkbenchInteractionState` (selection, hover) — отдельный view-only state, не входит в `ProjectInputs`, `ProjectViewState`, `ProjectEvaluation`, project JSON, `ProjectCommand`, `reduceProject()` или `deriveProject()`.
- Изменение selection/hover не запускает `deriveProject()`, не создаёт dirty state, не участвует в autosave и не входит в инженерный Undo/Redo.
- После добавления оборудования — авто-выбор нового объекта до первого render нового состояния.
- После импорта и reset — очистка selection/hover до render imported/default project.
- После удаления выбранного объекта — выбор ближайшего оставшегося по прежнему индексу либо empty state; hover удалённого объекта очищается.
- Синхронизация selection между списком, inspector, 2D canvas и 3D scene выполняется через текущую `ProjectEvaluationPublication`, без `ProjectCommand` и без повторного derive.
- Центральная очередь диагностик является UI view-model поверх текущих `ProjectEvaluation.constraints` и `ProjectEvaluation.balance`, а не новой domain diagnostics system.
- Selection визуально отделён от engineering status: engineering `data-ui-status` и severity rail не перезаписываются.
- Text-first warnings, safe IDs/anchors, подтверждение удаления и mobile card representation обязательны.
- Не менять UI framework, расчётные формулы, `ProjectInputs`, JSON schema, migrations, equipment domain model или persistence DTO.
- Equipment-only balance остаётся явно обозначен как неполная гидростатика.

## Commit Plan

- **Commit 1** (after tasks 1-3): `feat: add equipment interaction state foundation`
- **Commit 2** (after tasks 4-6): `feat: add equipment selection and inspector ui`
- **Commit 3** (after tasks 7-9): `feat: sync equipment selection in 2d and 3d views`
- **Commit 4** (after tasks 10-12): `feat: add unified diagnostics and issue navigation`
- **Commit 5** (after tasks 13-15): `feat: add delete safety and test coverage`

## Tasks

### Phase 1: Interaction State Foundation

- [x] Task 1: Define a pure `WorkbenchInteractionState` contract in a dedicated module.

  Deliverable: create `src/modules/ui/interactionState.ts` as a pure browser-free module. It defines `WorkbenchInteractionState` with `selectedEquipmentId: string | null` and `hoveredEquipmentId: string | null`, plus immutable helpers: `createDefaultInteractionState()`, `selectEquipment(state, id)`, `clearSelection(state)`, `hoverEquipment(state, id | null)`, `clearHover(state)`, and `resolveSelectionAfterDelete(currentSelectionId, deletedId, beforeIds, afterIds)`. The delete resolver must know the deleted item’s former list position via `beforeIds` and choose previous item, otherwise next item, otherwise `null`. If the deleted item was hovered, hover must be cleared by the lifecycle layer. Do not place these helpers in `src/modules/ui/equipment.ts`, because that file is an HTML render adapter and imports logger.

  Files: `src/modules/ui/interactionState.ts`, `src/modules/ui/interactionState.test.ts`.

  Logging requirements: this module must be logger-free. Tests should assert behavior, not logs.

- [x] Task 2: Add a targeted interaction runtime that can re-render interaction surfaces without re-deriving engineering data. (depends on Task 1)

  Deliverable: add a narrow closure-based runtime in `src/app/interactionRuntime.ts` or a clearly bounded section of `src/app/main.ts`. It owns the current `WorkbenchInteractionState`, exposes `getInteractionState()`, `setInteractionState(next, trigger)`, and a `renderInteractionViews()` path that reads `projectEvaluationRuntime.getPublication()` and updates only interaction-dependent surfaces. It must not dispatch `ProjectCommand`, call `deriveProject()`, or call `renderCommittedState()` on selection/hover changes. `renderPublication()` should read the current interaction state and pass it to equipment list, inspector, diagnostics, 2D canvas and 3D scene when doing normal engineering renders. Interaction-only changes should avoid unnecessary full equipment editor rebuilds where practical: list selection/hover may be class-toggled, while inspector/canvas/3D can redraw from the existing publication.

  Files: `src/app/main.ts`, optionally `src/app/interactionRuntime.ts`.

  Logging requirements: log `DEBUG [ui.interaction]` only when selection or hover actually changes, with selected ID or null, hovered ID or null, and trigger (`add`, `delete`, `row`, `canvas`, `diagnostics`, `import`, `reset`, `hover`). Do not log on every render cycle and do not log user-entered project values.

- [x] Task 3: Wire interaction lifecycle into add, delete, import and reset before render. (depends on Tasks 1-2)

  Deliverable: update `src/app/main.ts` equipment add/delete/import/reset flows so interaction state is computed before rendering the committed project. For add/delete, do not rely on `commitProjectCommand()` when it would render before selection is updated; instead capture `before` snapshot, dispatch, compute next interaction state from `before` and `committed`, set interaction state, then render once. On `AddEquipment`, select the newly added ID. On `applyPreparedProjectImport()` and reset handler, clear selection and hover before `renderCommittedState()`. On `DeleteEquipment`, if the selected item was deleted, call `resolveSelectionAfterDelete(currentSelectionId, deletedId, beforeIds, afterIds)` and clear hover when it points to the deleted ID. This must preserve the invariant that interaction state changes never create a project command and never dirty the project.

  Files: `src/app/main.ts`, `src/modules/ui/interactionState.ts`, `src/modules/ui/interactionState.test.ts`.

  Logging requirements: use Task 2 interaction logs for add/delete/import/reset transitions. Pure resolver stays logger-free. Do not log equipment names or field values.

### Phase 2: Selection UI — List And Inspector

- [x] Task 4: Add equipment row selection behavior without overwriting engineering status. (depends on Tasks 1-3)

  Deliverable: update `src/modules/ui/equipment.ts` so `renderEquipmentEditor` accepts optional interaction state or selected/hovered IDs. The selected row keeps its engineering status classes and `data-ui-status="normal|warning|error"`; selection is represented separately with `equipment-row--selected`, `data-equipment-selected="true"`, `aria-selected="true"`, and optionally an additional `ui-status--selected` class only if it does not overwrite engineering `data-ui-status`. Add a helper `isEquipmentRowSelectionEvent(event)` that returns false for `input`, `select`, `button`, `[data-action]`, labels controlling inputs, and other interactive descendants. Wire row click/keyboard activation to select the row without breaking existing delete/change/input delegation, `readEquipmentUpdate()`, `equipmentIdFromEvent()`, or `isEquipmentDeleteEvent()`. Empty state must be compatible with null selection.

  Files: `src/modules/ui/equipment.ts`, `src/app/main.ts`, `src/app/dom-contract.test.ts`.

  Logging requirements: row helper and renderer remain logger-free. Selection logs happen only in the interaction runtime from Task 2.

- [x] Task 5: Build an equipment inspector surface for the selected object. (depends on Task 4)

  Deliverable: add a stable inspector mount point, e.g. `#equipment-inspector`, inside the equipment zone in `index.html`. Implement `src/modules/ui/equipmentInspector.ts` with a pure view-model and render function. The inspector shows selected item name, shape, mass, Body/SNAME-NED position, dimensions per shape, displaced volume, engineering constraint status, and issue text. The inspector derives everything from `ProjectInputs.equipment`, `ProjectEvaluation.constraints`, and existing equipment helpers; it does not recalculate geometry, containment, intersections or balance. When no item is selected, render the intentional empty state: `Выберите оборудование для просмотра параметров`. Do not add persistence or `ProjectInputs` fields. Diagnostic navigation links are deferred to Task 11; until then the inspector may link only to `#diagnostics-zone-title` or omit the link.

  Files: `index.html`, `src/app/styles.css`, `src/modules/ui/equipmentInspector.ts`, `src/modules/ui/equipmentInspector.test.ts`, `src/app/main.ts`, `src/app/dom-contract.test.ts`.

  Logging requirements: inspector view-model and renderer must be logger-free. If `main.ts` cannot render because there is no current publication, log `DEBUG [ui.inspector]` fallback once per interaction render path. Do not log selected item names or values.

- [x] Task 6: Style selection as a separate visual layer using existing selected tokens. (depends on Tasks 4-5)

  Deliverable: reuse existing `--status-selected-*` variables and `selected` semantic status vocabulary; do not redefine token names unless missing. Add CSS for `.equipment-row--selected`, `[data-equipment-selected="true"]`, inspector selected header/chip, and focus-visible behavior. Selection must not use the existing equipment `border-left` engineering severity rail. Use a non-conflicting layer such as outline, inset box-shadow, top/right accent, or a visible `Выбрано` chip. Engineering warning/error/normal badges and rails remain independently visible. Selection must be understandable without color alone and remain accessible via keyboard focus.

  Files: `src/app/styles.css`, `src/app/dom-contract.test.ts`, optionally `src/modules/ui/statusTokens.ts` only if a missing mapping helper is required.

  Logging requirements: CSS/token presentation changes add no runtime logs. Any new mapping helper must be logger-free.

### Phase 3: Selection In 2D And 3D

- [x] Task 7: Add 2D canvas selection/hover overlay using interaction rendering constants. (depends on Tasks 1-3)

  Deliverable: update `src/modules/rendering/canvas2d.ts` so `renderCanvasProfile()` accepts an optional interaction object: `interaction?: { selectedEquipmentId: string | null; hoveredEquipmentId: string | null }`. Keep engineering status rendering exactly as-is. Add separate rendering interaction colors/constants for selected and hovered overlays; do not extend `RenderingSemanticStatus` or `renderingStatusColor(status)` with `selected`/`hovered`, because those are not `EquipmentConstraintStatus`. Draw order: engineering equipment overlay first, hover overlay second, selected overlay last. If selected and hovered IDs match, selected visual takes precedence. Use existing equipment XZ projection bounds for the base shape and draw slightly expanded outlines without changing hit-test bounds.

  Files: `src/modules/rendering/canvas2d.ts`, optionally new `src/modules/rendering/interactionColors.ts`, `src/app/main.ts`.

  Logging requirements: rendering constants and overlay helpers must be logger-free. Canvas render must not log per-frame. Missing selected/hovered IDs are skipped without logs.

- [x] Task 8: Add lightweight 3D selection/hover visual updates without mutating shared status materials. (depends on Tasks 1-3 and Task 7 if shared interaction colors are introduced)

  Deliverable: update `src/modules/rendering/scene3d.ts` and `src/modules/rendering/equipment3d.ts` so 3D equipment can show selected and hovered visual states without rebuilding meshes or mutating shared status materials. Do not add `selectedEquipmentId` or `hoveredEquipmentId` to `equipmentSignature()`. Add a lightweight `setEquipmentInteractionState(interaction)` method on `HullScene3d` or equivalent internal updater. It tracks previous/current selected/hovered IDs, updates only affected meshes, calls `draw()`, and does not call `replaceEquipment()`, `resize()`, clipping updates, or `renderCommittedState()`. Because current materials are shared by status, either create cached material variants by `(EquipmentConstraintStatus, visualState)` or clone per-mesh materials with explicit disposal. Store mesh metadata via `mesh.userData.equipmentId`/`status` or maintain a `Map<string, THREE.Mesh>`. The highlight must be visible in `solid` and `x-ray` modes.

  Files: `src/modules/rendering/scene3d.ts`, `src/modules/rendering/equipment3d.ts`, optionally `src/modules/rendering/interactionColors.ts`, `src/app/main.ts`.

  Logging requirements: material variant helpers must be logger-free. If interaction updater receives an ID that does not map to a mesh, log `DEBUG [rendering.3d]` once per interaction update, not per frame or per mesh.

- [x] Task 9: Wire click-to-select in 2D canvas with explicit CSS-pixel hit-testing. (depends on Task 7)

  Deliverable: expose or create a logger-free transform helper for the profile canvas, such as `createCanvasProfileTransform(canvas, snapshot)`, with `bodyXzToCanvas()` and `canvasToBodyXz()` methods. It must use CSS-pixel coordinates from `event.clientX/clientY - canvas.getBoundingClientRect().left/top`, not raw device pixels from `canvas.width/height`. Do not call `resizeCanvas()` during hit-testing because it mutates and clears the canvas. Add click selection with a small down/up movement threshold. Hit-test equipment projections in reverse render order so the visually topmost item wins, using base `equipmentXzProjection()` bounds rather than expanded selected/hover overlay bounds. Empty-space clicks do not clear selection. No right-click menu, multi-select, drag or CAD-like picking.

  Files: `src/modules/rendering/canvas2d.ts` or new `src/app/canvasSelection.ts`, `src/app/main.ts`, `src/modules/rendering/canvas2d.test.ts` if transform helper is exported.

  Logging requirements: log `DEBUG [ui.interaction]` only when a canvas hit changes selection. Do not log missed clicks, pointer coordinates or every click event.

### Phase 4: Unified Diagnostics

- [x] Task 10: Add a central diagnostics queue view-model with explicit target and dedupe policy. (depends on Tasks 1-3; can parallel with 4-9)

  Deliverable: create `src/modules/ui/diagnostics.ts` with a pure view-model that collects equipment constraint issues and current balance warnings into a queue. Diagnostic entries must include stable ID, severity, source (`constraint` or `balance`), target kind (`equipment` or `balanceGlobal`), optional `equipmentId`, optional safe anchor ID, Russian title/description, and navigation target. Use a Russian `BalanceWarningCode -> label` mapper extracted from `src/modules/ui/metrics.ts` or shared by metrics and diagnostics; never display core `BalanceWarning.message` directly in UI. Dedupe `invalidEquipment`: if a constraint `invalidEquipment` exists for an equipment ID, suppress or merge the balance `invalidEquipment` warning for the same ID. Treat `equipmentOnlyBuoyancyModel` as an experimental disclaimer/info item, not as a blocking queue warning. For no equipment, diagnostics can show neutral empty state (`Добавьте оборудование, чтобы увидеть диагностику компоновки`) while balance panel keeps its equipment-only disclaimer. Severity order: `invalidEquipment` > `outsideHull/outsideLength` > `intersects` > equipment-targeted balance warnings > global balance warnings/info, with stable tie-breaks by equipment list order then source order.

  Files: `src/modules/ui/diagnostics.ts`, `src/modules/ui/diagnostics.test.ts`, `src/modules/ui/metrics.ts` if warning labels are extracted, `index.html`, `src/app/styles.css`, `src/app/main.ts`, `src/app/dom-contract.test.ts`.

  Logging requirements: diagnostics view-model must be logger-free. Render boundary may log `DEBUG [ui.diagnostics]` only when diagnostic entry count changes, with count and severity summary, not issue text or user-entered names.

- [x] Task 11: Wire diagnostics issue navigation to equipment selection and safe anchors. (depends on Tasks 4, 5, 10)

  Deliverable: add stable DOM mount points and IDs: `#diagnostics-panel`, `#diagnostics-queue`, `#diagnostics-empty`, and `#equipment-inspector`. Do not reuse `#balance-warnings`, which remains owned by `renderBalanceMetrics()`. Each equipment-targeted diagnostic entry is clickable/focusable and on click or Enter/Space selects the equipment via `WorkbenchInteractionState`, scrolls the corresponding row into view, opens the equipment panel if collapsed, and focuses the row or a stable focus target. Use safe generated diagnostic entry IDs; do not put raw equipment IDs into DOM `id` or fragment IDs. Navigation may query rows with `[data-equipment-id="${CSS.escape(id)}"]`. Global balance diagnostics navigate to the balance panel or remain non-navigating. Add a "перейти к проблеме" link in the inspector only after diagnostics anchors exist.

  Files: `src/modules/ui/diagnostics.ts`, `src/modules/ui/equipmentInspector.ts`, `src/app/main.ts`, `index.html`, `src/app/styles.css`, `src/app/dom-contract.test.ts`.

  Logging requirements: use `DEBUG [ui.interaction]` only when issue navigation changes selection. Do not log diagnostic text, equipment names or every click.

- [x] Task 12: Add hover state from list/diagnostics and optional 2D canvas pointer hover. (depends on Tasks 1, 4, 7, 8, 10)

  Deliverable: on `mouseenter`/`mouseleave` over equipment rows and equipment-targeted diagnostic entries, update `hoveredEquipmentId`. In the equipment list, apply `equipment-row--hovered` distinct from selection and engineering status. In 2D and 3D, render hover using the interaction object/updater from Tasks 7-8. Do not add 3D raycasting or direct 3D pointer picking in this milestone; 3D hover comes from list/diagnostics/shared interaction state. If adding canvas pointer hover, reuse the Task 9 transform/hit-test helper, throttle/debounce pointermove, and do not log per movement. Hover clears on mouseleave, import, reset and deletion of the hovered item.

  Files: `src/modules/ui/equipment.ts`, `src/modules/ui/diagnostics.ts`, `src/app/styles.css`, `src/modules/rendering/canvas2d.ts`, `src/modules/rendering/scene3d.ts`, `src/app/main.ts`.

  Logging requirements: hover enter/leave should log only real state transitions through `DEBUG [ui.interaction]` and never per pointermove. 2D/3D hover rendering must be logger-free per frame.

### Phase 5: Safety, Mobile And Tests

- [x] Task 13: Add safe delete confirmation with `window.confirm()` and selection fallback. (depends on Task 3)

  Deliverable: replace immediate deletion with a confirmation path in the existing delete handler. Use `window.confirm("Удалить выбранное оборудование?")` or a similarly concise Russian message that may show the equipment name to the user only in the dialog, but does not log it. If confirmed, dispatch `DeleteEquipment`, compute selection fallback from Task 3 before render, clear hover if needed, and render once. If cancelled, do nothing. Do not implement inline confirmation in this slice because current `renderEquipmentEditor()` replaces `innerHTML` on render and would require another transient pending-delete state. Preserve event delegation helpers or extend them narrowly for confirmation.

  Files: `src/app/main.ts`, `src/modules/ui/equipment.ts` if helper contracts change, `src/app/dom-contract.test.ts`, `tests/e2e/import-export.spec.ts`.

  Logging requirements: log `DEBUG [ui.equipment]` delete confirmed/cancelled with equipment ID and action result only. Do not log equipment name, dialog text or field values.

- [x] Task 14: Ensure mobile card representation and responsive safety for selected/inspected equipment. (depends on Tasks 4-6, 10-11)

  Deliverable: at existing breakpoints (`max-width: 760px` and `max-width: 560px`), equipment rows render as cards with stacked labels/inputs, selected/hover indicators remain visible, inspector and diagnostics queue wrap without horizontal overflow, and delete confirmation remains reachable on touch targets >= 44px. The theoretical drawing may retain its intentional local horizontal scroll; document-level overflow remains within current Playwright tolerance. Do not create a separate mobile-only flow or mobile-only state; adapt desktop components via CSS.

  Files: `src/app/styles.css`, `src/modules/ui/equipment.ts` if row markup needs semantic wrappers, `tests/e2e/import-export.spec.ts`.

  Logging requirements: responsive CSS adds no logs. Equipment row renderer remains logger-free.

- [x] Task 15: Add comprehensive tests, encoding checks and documentation updates. (depends on Tasks 1-14)

  Deliverable: add Vitest tests for `interactionState` pure functions, including delete fallback with `beforeIds/afterIds`, hover clearing, and no mutation. Add view-model tests for diagnostics: Russian balance label mapping, no-equipment empty state despite equipment-only disclaimer, global vs equipment-targeted warnings, invalid-equipment dedupe, `outsideLength` severity bucket, and stable tie-break ordering. Add inspector tests for empty state, field mapping per shape, status display and diagnostic link after Task 11. Update DOM contract tests with `#equipment-inspector`, `#diagnostics-panel`, `#diagnostics-queue`, `#diagnostics-empty`, selection marker contract (`data-equipment-selected`/`aria-selected`), and confirmation dialog trigger. Add Playwright tests for row click -> selection -> inspector update -> 2D/3D highlight sync; add equipment -> auto-select; import/reset -> selection cleared; delete confirm accept/cancel and nearest fallback; diagnostics issue click -> selection; JSON export after selection/hover contains no `selectedEquipmentId`, `hoveredEquipmentId` or `WorkbenchInteractionState`; mobile card layout/no-overflow. Update `scripts/check-encoding.mjs` expected strings with actual new Russian strings from source: `Выберите оборудование для просмотра параметров`, diagnostics heading, `перейти к проблеме`, and delete confirmation text. Update `docs/ui-ux.md`, `DESIGN.md`, and `docs/testing.md` to describe the implemented selection/inspector/diagnostics workflow and remove old "not implemented" wording for this milestone.

  Files: `src/modules/ui/interactionState.test.ts`, `src/modules/ui/diagnostics.test.ts`, `src/modules/ui/equipmentInspector.test.ts`, `src/app/dom-contract.test.ts`, `tests/e2e/import-export.spec.ts`, `scripts/check-encoding.mjs`, `docs/ui-ux.md`, `DESIGN.md`, `docs/testing.md`.

  Logging requirements: tests must not add test-only runtime logs. Assert pure helpers remain logger-free. Assert interaction transition logging boundaries without expecting logs on normal render cycles or pointermove.

## Verification Gates

- `npm run test`
- `npm run test:e2e -- tests/e2e/import-export.spec.ts`
- `npm run check:encoding`
- `npm run build`

## Acceptance Criteria

- `WorkbenchInteractionState` exists as view-only state and is not serialized, persisted, dispatched as `ProjectCommand`, included in `ProjectInputs`/`ProjectViewState`/`ProjectEvaluation`, or used by `deriveProject()`.
- Selection/hover changes re-render from the latest `ProjectEvaluationPublication` without dirtying project state or causing a new engineering derive.
- Add/import/reset/delete lifecycle follows the ROADMAP rule exactly: add selects new object, import/reset clear selection/hover, delete selected chooses nearest remaining by old index or null.
- Equipment row engineering status remains intact (`data-ui-status` continues to describe engineering severity); selection uses separate markers such as `data-equipment-selected`, `aria-selected`, `equipment-row--selected` and a non-conflicting visual layer.
- Inspector shows selected item details from existing inputs/evaluation only, and empty state is intentional when no selection exists.
- 2D canvas and 3D scene show selected/hovered equipment without changing constraint colors, `equipmentSignature()` semantics, geometry calculations or mesh rebuild behavior on interaction-only changes.
- 2D canvas click selection uses CSS-pixel coordinate transforms and deterministic reverse-order hit-testing.
- Diagnostics queue distinguishes equipment-targeted entries from global balance entries, uses Russian UI labels, dedupes invalid-equipment duplicates, includes `outsideLength`, and navigates only when a target exists.
- Safe IDs/anchors are used for diagnostics and equipment navigation; raw equipment IDs are not inserted into DOM IDs.
- Delete requires confirmation and logs only equipment ID/action result.
- Mobile equipment cards, inspector and diagnostics have no document-level horizontal overflow and maintain touch targets.
- JSON export remains free of selection/hover/interaction state after all interaction flows.
- Existing formulas, `ProjectInputs`, JSON schema, migrations, equipment domain model and UI framework are unchanged.
- Equipment-only balance remains clearly marked as not full hydrostatics.
- Vitest, Playwright, encoding and build gates pass.
