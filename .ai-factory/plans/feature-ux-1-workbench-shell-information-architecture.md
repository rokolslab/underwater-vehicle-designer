# Implementation Plan: UX-1 Workbench Shell And Information Architecture

Branch: feature/ux-1-workbench-shell-information-architecture
Created: 2026-08-06

## Original Request

Создай план для продолжения milestone UX-1:
"Сформировать единую UI-систему и ясный каркас инженерного workbench".

Контекст:
первый инкремент UX-1 уже завершён и заархивирован как
.ai-factory/archive/plans/feature-ux-1-semantic-ui-foundation.md.
Он закрыл semantic UI foundation, accessibility и status tokens.

Новый план должен покрыть следующий slice UX-1:
workbench shell и information architecture.

Scope:
- верхняя project toolbar;
- компактный engineering summary;
- ясное визуальное разделение параметров корпуса, viewport, оборудования, диагностики и экспорта;
- базовый desktop workbench shell;
- группировка параметров корпуса, метода, расчётных настроек и операций с проектом;
- сохранение существующих semantic status tokens, focus states и accessibility contracts;
- сохранение proximity экспорта к соответствующим инженерным представлениям;
- обновление релевантных Vitest/Playwright/encoding/build checks.

Non-goals:
- не менять UI framework;
- не менять расчётные формулы;
- не менять ProjectInputs, JSON schema или migrations без предметной необходимости;
- не добавлять equipment selection, selectedEquipmentId, hover state или inspector;
- не добавлять central diagnostics queue;
- не добавлять CAD-lite viewport controls, camera presets, gizmo или pointer picking;
- не делать отдельный mobile inspect/export flow;
- не делать public hero redesign;
- не добавлять псевдо-CAD controls или неподтверждённые engineering claims.

План должен опираться на:
- .ai-factory/ROADMAP.md;
- .ai-factory/archive/plans/feature-ux-1-semantic-ui-foundation.md;
- PRODUCT.md;
- DESIGN.md;
- docs/ui-ux.md;
- docs/design/impeccable-analysis.md;
- docs/architecture/ui-refactoring-context.md.

Важно:
UI не должен становиться источником инженерной истины. Geometry, calculations и exports не должны дублироваться в presentation layer.

## Settings

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "Сформировать единую UI-систему и ясный каркас инженерного workbench"
Rationale: это второй slice UX-1 после semantic UI foundation: workbench shell и information architecture должны сделать основной engineering сценарий читаемым без изменения расчетных или persistence contracts.

## Source Documents

- `.ai-factory/ROADMAP.md`: фиксирует UX-1 scope, порядок продуктовых вех, non-goals, status token vocabulary и release gates.
- `.ai-factory/archive/plans/feature-ux-1-semantic-ui-foundation.md`: фиксирует уже выполненный первый slice и границы, которые нельзя откатывать: semantic statuses, focus/disabled/touch target states, no interactive descendants inside `summary`, safe equipment accessibility IDs и rendering-local status colors.
- `PRODUCT.md`: фиксирует продукт как engineering workbench, аудиторию инженеров, Body/SNAME-NED контекст, запрет на full CAD/CAE и full hydrostatics claims.
- `DESIGN.md`: фиксирует текущий visual authority, статус выполненного UX-1 foundation, debt по плотности workbench и правила сохранения export proximity.
- `docs/ui-ux.md`: фиксирует текущую структуру панелей, текущие controls/exports и будущие UX rules.
- `docs/design/impeccable-analysis.md`: фиксирует оставшиеся P1/P2 проблемы workbench IA: плотность решений, отсутствие compact summary, слабая grouping модель, runtime status gap и тестовые ожидания.
- `docs/architecture/ui-refactoring-context.md`: фиксирует UI как browser adapter над `ProjectInputs`, `ProjectViewState` и `ProjectEvaluationPublication`, запрет на пересчет engineering data в presentation layer и рекомендацию panel/view-model seams без framework migration.

## Scope Guardrails

- Workbench shell должен оставаться desktop-first, но не ломать текущую mobile-supported адаптацию и существующий no-horizontal-overflow smoke.
- UI читает canonical engineering inputs из `ProjectStore`/DOM control adapters, derived outputs из текущей `ProjectEvaluationPublication`, а view-only state из `ProjectViewState`; новые summary/toolbar элементы не становятся вторым владельцем engineering state.
- Engineering summary показывает компактный обзор текущего проекта, режима, ключевых размерений, оборудования и equipment-only balance status, но не дублирует формулы и не вычисляет geometry/balance заново.
- Export proximity сохраняется: SVG рядом с 2D profile, theoretical drawing SVG рядом с theoretical drawing, CSV рядом со station table, JSON project actions в project toolbar или project operations group.
- Верхняя project toolbar не должна превращаться в pseudo-CAD tool ribbon: только операции проекта, быстрые navigation/actions к существующим engineering surfaces и честный runtime/project status.
- Существующие semantic statuses `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, `running`, `data-ui-status`, `ui-status--*`, focus states и accessibility contracts сохраняются; новые shell statuses должны использовать этот vocabulary или явно оставаться text-only.
- Не добавлять equipment selection, `selectedEquipmentId`, hover state, inspector, central diagnostics queue, CAD-lite viewport controls, camera presets, gizmo, pointer picking, отдельный mobile inspect/export flow или public hero redesign.
- Не менять расчётные формулы, geometry modes, equipment constraints, balance formulas, `ProjectInputs`, JSON schema, migrations или UI framework без отдельной предметной причины.

## Commit Plan

- **Commit 1** (after tasks 1-4): `feat: add ux1 workbench shell structure`
- **Commit 2** (after tasks 5-7): `feat: clarify workbench information architecture`
- **Commit 3** (after tasks 8-9): `test: cover ux1 workbench shell contracts`

## Tasks

### Phase 1: Shell Contract And Toolbar

- [x] Task 1: Define the desktop workbench shell structure and section landmarks in `index.html` and `src/app/styles.css`.

  Deliverable: introduce a clearer shell hierarchy around the existing workbench without changing the UI framework: project toolbar area, compact engineering summary area, hull parameter/control area, viewport area, equipment area, diagnostics/balance area and export/data area. Preserve existing first-level `details.panel-details` sections where practical, preserve current panel IDs and required DOM IDs used by `src/app/main.ts`, and keep interactive actions outside `summary`. Do not move public hero content into this task except for anchor/landmark compatibility required by the workbench shell.

  Files: `index.html`, `src/app/styles.css`, `src/app/dom-contract.test.ts`.

  Logging requirements: no runtime logging is required for static shell markup and CSS. If required DOM lookup changes in `src/app/main.ts` become necessary, keep existing required-element failure behavior and do not add routine layout logs.

- [x] Task 2: Add the upper project toolbar for project-level operations and workbench orientation. (depends on Task 1)

  Deliverable: create a top workbench toolbar that groups project operations such as reset, JSON import, JSON export and high-level anchors to existing surfaces. Preserve existing handlers, Playwright selectors and IDs for `#reset`, `#download-project-json`, `#upload-project-json`, and `#project-json-input` unless the same task updates every caller/test. Keep engineering exports near their corresponding views instead of centralizing all downloads in the toolbar. Toolbar copy must be Russian, compact and engineering-honest; do not add pseudo-CAD controls, camera presets, picking tools, undo/redo, dirty/autosave claims or unsupported project lifecycle states.

  Files: `index.html`, `src/app/styles.css`, `src/app/main.ts` only if event wiring must follow moved nodes, `src/app/dom-contract.test.ts`, `tests/e2e/import-export.spec.ts`.

  Logging requirements: keep project operation logging at existing boundaries only. Do not log normal button clicks. If toolbar wiring cannot find a required control, use the existing required-element error path; if import/export failures are already logged or shown, preserve current behavior without adding project data to logs.

- [x] Task 3: Add a compact engineering summary that consumes existing publication/results rather than recalculating engineering data. (depends on Task 1)

  Deliverable: add a concise summary surface for current principal dimensions, geometry mode label, station count, equipment count, equipment constraint severity and equipment-only balance status. Define an explicit summary view-model/renderer contract that consumes `ProjectEvaluationPublication` and existing `ProjectInputs` data only: labels through `geometryModePresentation`, numeric display through `formatNumber`, equipment severity from `evaluation.constraints.issues`/`statusById`, and balance status from `evaluation.balance.warnings`. Do not connect the existing legacy-like `renderMetrics()` helper blindly if its `maxRadius`/`maxHeight` contract does not match the new summary. Keep `Баланс оборудования` explicitly experimental/equipment-only; do not present summary as watertight-envelope hydrostatics.

  Files: `index.html`, `src/app/main.ts`, `src/modules/ui/metrics.ts`, `src/modules/ui/metrics.test.ts`, `src/app/dom-contract.test.ts`, `src/app/styles.css`.

  Logging requirements: pure summary formatting helpers must be logger-free. If `main.ts` applies a fallback because publication is unavailable, log at `DEBUG [ui.summary]` without user project values; do not log on every render cycle.

- [x] Task 4: Create a narrow workbench shell UI adapter/view-model contract for toolbar and summary bindings. (depends on Tasks 1-3)

  Deliverable: introduce the smallest useful browser-adapter seam for the new shell, such as `src/modules/ui/workbenchSummary.ts` or `src/modules/ui/workbenchShell.ts`, so `src/app/main.ts` wires elements and publications but does not accumulate shell formatting logic. The helper may expose typed element contracts, pure formatting/view-model functions and a small render function for toolbar/summary state. Keep engineering mutations routed through existing `ProjectCommand` dispatch and keep view-only actions separate from `ProjectCommand`. Do not create a framework abstraction, global diagnostics queue, selection store, dirty/autosave state or JSON-persisted shell state.

  Files: likely `src/modules/ui/workbenchSummary.ts` or `src/modules/ui/workbenchShell.ts`, `src/modules/ui/workbenchSummary.test.ts` or `src/modules/ui/workbenchShell.test.ts`, `src/app/main.ts`, `src/app/dom-contract.test.ts`.

  Logging requirements: pure view-model/formatting helpers must be logger-free. Render-boundary code may log a single `DEBUG [ui.workbench]` fallback when required publication data is absent, but must not log on every normal render and must not include user-entered project values.

### Phase 2: Information Architecture And Grouping

- [x] Task 5: Group hull dimensions, geometry method and calculation settings into readable control clusters. (depends on Tasks 1-4)

  Deliverable: reorganize the `Размерения` area so a user can distinguish hull geometry inputs (`L`, `lambda`, `B`, `H`, `ЦВК`, stations), method/formula controls (`geometry-mode`, `geometry-formula`) and calculation settings (`water-density`) without scanning a flat grid. Project operations belong to the toolbar from Task 2 and must not be duplicated inside `Размерения`. Preserve the existing input IDs and `src/modules/ui/controls.ts` contract. Keep `H = L / lambda` behavior and application normalization unchanged. Do not add new `ProjectInputs` fields or JSON schema changes.

  Files: `index.html`, `src/app/styles.css`, `src/modules/ui/controls.ts` only if typed grouping metadata is unavoidable, `src/app/appState.test.ts`, `src/app/dom-contract.test.ts`.

  Logging requirements: control grouping is presentation-only and should add no runtime logs. Existing input normalization and fallback logging policies remain unchanged; do not log user-entered numeric values from new grouping helpers.

- [x] Task 6: Clarify viewport, equipment, diagnostics and export zones while preserving export proximity. (depends on Tasks 1 and 4)

  Deliverable: make the visual boundary between 2D profile, 3D hull, theoretical drawing, equipment editor, balance/diagnostics and station table clearer through shell layout, section labels and local action groups. Keep `#download-svg` near `#profile-canvas`, `#download-theoretical-drawing-svg` near `#theoretical-drawing-canvas`, and `#download-csv` near the station table. Guard against known layout regressions: dense grids must use `min-width: 0`/wrapping or local scroll boundaries where needed, equipment rows must stay readable and must not be squeezed beside 3D merely to look CAD-like, and view toggles must not return to `summary`. Do not add central diagnostics queue, object selection, selected/hover state, inspector, CAD-lite controls, camera presets or pointer picking. Preserve Canvas/Three.js render contracts and do not make rendering adapters read DOM layout data for engineering calculations.

  Files: `index.html`, `src/app/styles.css`, `src/app/main.ts` only for moved local actions, `src/modules/ui/table.ts` only if table caption/empty text needs a local adapter update, `src/app/dom-contract.test.ts`, `tests/e2e/import-export.spec.ts`.

  Logging requirements: local action movement should not add logs. If moved export buttons require rebinding, preserve existing export error handling and do not add logs that include serialized project JSON, CSV, SVG or user-entered equipment values.

- [x] Task 7: Preserve and extend accessibility/focus/status contracts for the new shell. (depends on Tasks 2-6)

  Deliverable: ensure new toolbar, summary, grouped controls and zone labels have accessible names, logical heading order, keyboard reachability, visible focus states, no interactive descendants inside `summary`, text-visible statuses and no color-only status meaning. Reuse existing semantic tokens and `data-ui-status`/`ui-status--*` classes. If the summary needs a shell-level status, map it to existing `normal`, `warning`, `error` or `experimental`; do not create runtime `selected`, `stale` or `running` state in this slice.

  Files: `index.html`, `src/app/styles.css`, `src/modules/ui/statusTokens.ts` only if a narrow presentation mapping is required, `src/modules/ui/statusTokens.test.ts`, `src/app/dom-contract.test.ts`, `tests/e2e/import-export.spec.ts`.

  Logging requirements: accessibility attributes, focus styles and token mappings should be logger-free. Unknown semantic status fallback, if introduced in UI adapter code, may log `WARN [ui.status]` once per update path with the token name only, not project data.

### Phase 3: Responsive Safety And Documentation

- [ ] Task 8: Add targeted Vitest, Playwright and encoding coverage for the workbench shell. (depends on Tasks 1-7)

  Deliverable: update tests to lock the new IA without overfitting visual pixels. Add Vitest contracts for required DOM IDs, new shell/summary IDs consumed by `requiredElement()`, toolbar/project action presence, engineering summary text/status, grouped control labels, export proximity, summary header validity and semantic status reuse. Add focused tests for any new `workbenchSummary`/`workbenchShell` helper so summary values come from publication-shaped inputs and not duplicated formulas. Add Playwright desktop smoke for toolbar/summary/workbench visibility, keyboard focus/disclosure smoke, import/export round-trip after toolbar movement, download actions from their local views, and mobile no-overflow regression for the updated shell. Update encoding checks with any new critical Russian UI strings.

  Files: `src/app/dom-contract.test.ts`, `src/modules/ui/metrics.test.ts`, new helper tests such as `src/modules/ui/workbenchSummary.test.ts` if added, `src/modules/ui/statusTokens.test.ts` if needed, `tests/e2e/import-export.spec.ts`, `scripts/check-encoding.mjs`, `package.json` only if an existing script needs a documented alias.

  Logging requirements: tests should not add test-only runtime logs. If test helpers inspect console output, assert that pure UI formatting/token helpers remain logger-free and that any `DEBUG`/`WARN` boundaries introduced by earlier tasks are stable and non-data-bearing.

- [ ] Task 9: Update documentation and design notes for the completed workbench IA slice. (depends on Tasks 1-8)

  Deliverable: update `docs/ui-ux.md` with the new workbench shell structure, toolbar semantics, engineering summary scope, grouped controls and export proximity rules. Update `DESIGN.md` with the UX-1 workbench shell status and any new shell/layout tokens. Update `docs/design/impeccable-analysis.md` only with a short follow-up note, not a full rewrite. Update `docs/architecture/ui-refactoring-context.md` only if implementation creates explicit panel/view-model seams or changes `main.ts` responsibilities; otherwise leave architecture docs unchanged. Keep documentation clear that this slice did not add selection, central diagnostics, CAD-lite viewport controls, mobile flow, public hero redesign, formulas, `ProjectInputs`, JSON schema or migrations.

  Files: `docs/ui-ux.md`, `DESIGN.md`, `docs/design/impeccable-analysis.md`, optionally `docs/architecture/ui-refactoring-context.md`.

  Logging requirements: documentation changes add no runtime logging. If docs mention logging, document only the agreed boundaries: pure UI helpers logger-free, `main.ts` fallback/debug logs stable and non-data-bearing, export/import failures handled at browser adapter boundaries.

## Verification Gates

- `npm run test`
- `npm run test:e2e`
- `npm run check:encoding`
- `npm run build`

Docker equivalents for non-browser gates when using the preferred agent environment:

- `docker compose run --rm app npm run test`
- `docker compose run --rm app npm run check:encoding`
- `docker compose run --rm app npm run build`

## Acceptance Criteria

- Workbench has a clear desktop shell with project toolbar, compact engineering summary, grouped hull/method/calculation controls and distinct viewport/equipment/diagnostics/export zones.
- Existing semantic status tokens, focus states, accessibility contracts and no-interactive-descendants-inside-`summary` rule remain intact.
- Engineering summary and shell status consume existing normalized inputs and `ProjectEvaluationPublication` outputs; UI does not duplicate geometry, containment, balance or export calculations.
- JSON project actions are reachable from the project toolbar, while SVG/theoretical SVG/CSV exports remain near their corresponding engineering views.
- Existing `ProjectInputs`, JSON schema, migrations, geometry formulas, equipment constraints, balance formulas and UI framework are unchanged unless a later implementation records a concrete reason.
- No equipment selection, `selectedEquipmentId`, hover state, inspector, central diagnostics queue, CAD-lite viewport controls, camera presets, gizmo, pointer picking, mobile inspect/export flow or public hero redesign is introduced.
- Russian UI text remains intact, statuses are understandable without color alone, and Body/SNAME-NED/equipment-only balance terminology stays explicit.
- Relevant Vitest, Playwright, encoding and build gates pass.
