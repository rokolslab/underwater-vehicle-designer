# Implementation Plan: UX-1 Semantic UI Foundation

Branch: feature/ux-1-semantic-ui-foundation
Created: 2026-08-06
Refined: 2026-08-06

## Original Request

Создай план для первого инкремента milestone UX-1:
"Сформировать единую UI-систему и ясный каркас инженерного workbench".

Scope только:
semantic UI foundation, accessibility и status tokens.

Не включать:
- полную перестройку workbench shell;
- новую information architecture всего workbench;
- selection оборудования;
- CAD-lite viewport;
- mobile flow;
- public hero redesign;
- смену UI framework;
- изменения расчётных формул, ProjectInputs или JSON schema.

План должен опираться на .ai-factory/ROADMAP.md, PRODUCT.md, DESIGN.md и docs/design/impeccable-analysis.md.

## Settings

- Testing: yes
- Logging: verbose
- Docs: yes

## Roadmap Linkage

Milestone: "Сформировать единую UI-систему и ясный каркас инженерного workbench"
Rationale: это первый рекомендованный slice UX-1 из `.ai-factory/ROADMAP.md`: semantic UI foundation, accessibility и status tokens перед последующей workbench shell / information architecture работой.

## Source Documents

- `.ai-factory/ROADMAP.md`: задает UX-1 milestone, status vocabulary, non-goals и release gates для UI-вех.
- `PRODUCT.md`: фиксирует инженерный workbench как основной продукт, Product register, аудиторию инженеров, запрет на full CAD/CAE и full hydrostatics claims.
- `DESIGN.md`: фиксирует текущий визуальный язык, цветовые роли, typography, status debt и missing tokens.
- `docs/design/impeccable-analysis.md`: фиксирует P1/P2 accessibility defects, missing semantic status token model и необходимые Playwright checks.
- `docs/ui-ux.md`: фиксирует текущие панели, экспорт рядом с view и русскую операционную терминологию.
- `docs/architecture/ui-refactoring-context.md`: фиксирует UI как browser adapter над `ProjectInputs`, `ProjectEvaluationPublication` и `ProjectViewState`, без пересчета geometry в UI.

## Scope Guardrails

- Не менять расчётные формулы, geometry modes, equipment constraints, balance formulas, `ProjectInputs`, migrations или JSON schema.
- Не менять UI framework и не начинать перенос на React/Svelte/etc.
- Не проектировать новую information architecture всего workbench; допустимы только локальные markup/a11y корректировки текущих panels.
- Не добавлять equipment selection, hover state, inspector, central diagnostic queue или 2D/3D selection linking.
- Не добавлять CAD-lite viewport controls, camera presets, orientation cube, direct manipulation, gizmo или pointer picking.
- Не выполнять public hero redesign; hero затрагивать только если общий token/focus reset ломает существующие styles.
- Не делать отдельный mobile flow; допустимы только базовые accessible target/focus fixes, если они не меняют mobile сценарий.
- Статусы должны быть понятны без одного только цвета: текст, label, `aria-*` или stable visible marker обязателен.
- Equipment left accent допускается только как semantic status rail, не как декоративный side tab.
- `selected` в этом инкременте является token-only: не добавлять selection state, `selectedEquipmentId`, hover state, linked highlights или persistence.
- `stale` и `running` в этом инкременте являются token/style placeholders: не добавлять новый runtime phase state, async workflow state или diagnostics system.
- Не заменять alert-based import errors новым notification/diagnostics flow; error token можно определить без изменения текущего invalid JSON behavior.

## Commit Plan

- **Commit 1** (after tasks 1-4): `feat: add semantic ui status foundations`
- **Commit 2** (after tasks 5-8): `fix: improve workbench accessibility states`
- **Commit 3** (after tasks 9-10): `test: cover ui status and accessibility contracts`

## Tasks

### Phase 1: Semantic Token Contract

- [x] Task 1: Add the base semantic UI token layer in `src/app/styles.css`.

  Deliverable: extend `:root` with named status tokens for `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, and `running`, plus focus/selection/touch-target tokens that map to the existing restrained engineering palette from `DESIGN.md`. Preserve current visual identity: teal/cyan technical accents, amber/rose diagnostics, scarce `--signal`, light operational surfaces, no glassmorphism, no generic dashboard styling. Avoid using `--signal` as a generic success token unless the owner later confirms it.

  Files: `src/app/styles.css`.

  Logging requirements: no runtime logging is required for CSS-only token definitions. Add no console output. If a future implementation extracts token metadata into TypeScript during this task, keep it pure and logger-free, and rely on tests/build for verification.

- [x] Task 2: Define the explicit semantic status contract before mapping current UI states. (depends on Task 1)

  Deliverable: document and test the exact semantic vocabulary used by this increment: `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, and `running`. Define the intended CSS variable families for each status where applicable: text, background, border, accent/status rail, and focus/outline. Define the stable class or attribute convention for DOM status presentation, such as `data-ui-status="warning"` or a narrow `ui-status--warning` class family, without removing existing domain-specific compatibility classes. Keep `selected`, `stale`, and `running` token-only unless an existing control already has a native disabled/loading-like state.

  Files: likely `src/modules/ui/statusTokens.ts` or another narrow UI adapter helper, `src/app/styles.css`, `src/app/dom-contract.test.ts` or a dedicated UI status test.

  Logging requirements: semantic contract helpers must be pure and logger-free. Do not add runtime logs for normal token/class lookup; tests should catch missing contract entries.

- [x] Task 3: Create an adapter-level semantic status mapping for existing UI statuses without changing domain status codes. (depends on Task 2)

  Deliverable: introduce a small UI-layer mapping that converts existing presentation needs into semantic tokens/classes while leaving domain contracts intact. Map equipment constraint statuses from `src/modules/equipment/constraints.ts` explicitly as `ok -> normal`, `intersects -> warning`, `outsideHull -> error`, and `invalidEquipment -> error`. Include balance experimental/warning, import success/migration notice, WebGL fallback, and disabled/stale/running placeholders only as presentation tokens; do not add new engineering states to `ProjectInputs` or JSON. Keep Russian labels in the UI adapter, not in core calculations.

  Files: likely `src/modules/ui/statusTokens.ts`, `src/modules/ui/equipment.ts`, `src/modules/ui/metrics.ts`, `src/app/main.ts` only if current notices need class assignment.

  Logging requirements: new mapping helpers must be pure and logger-free. Existing render-boundary logging in `src/modules/ui/equipment.ts` and `src/modules/ui/metrics.ts` may remain, but do not add new render-cycle logs. If `main.ts` applies notice/status classes and receives an unknown token, log at `DEBUG` with a stable prefix such as `[ui.status]`; do not log user-entered values.

- [x] Task 4: Apply semantic status tokens to DOM presentation while preserving existing product wording and compatibility classes. (depends on Task 3)

  Deliverable: refactor status-related CSS classes to consume the new semantic tokens for `.equipment-status`, `.equipment-row`, `.equipment-warning-summary`, `.balance-warning-summary`, `.experimental-pill`, `.project-import-notice`, and `.scene3d-fallback`. Preserve visible Russian labels such as `Норма`, `Вне корпуса`, `Пересечение`, `Ошибка данных`, `Experimental`, and the equipment-only balance disclaimer. Preserve existing domain-specific classes such as `equipment-row--outsideHull` and `equipment-status--intersects` unless the same task intentionally updates all affected tests. Add semantic classes or `data-ui-status` alongside them so existing tests and external DOM expectations do not break accidentally. Do not introduce a central diagnostics queue in this increment.

  Files: `src/app/styles.css`, `src/modules/ui/equipment.ts`, `src/modules/ui/metrics.ts`, `index.html` if static class names or attributes need semantic status tokens.

  Logging requirements: UI render helpers should remain logger-free for normal status rendering beyond existing render-boundary logs. If a status report is missing for an equipment item, keep existing fallback behavior and log at `DEBUG` only if there is already a nearby UI-boundary logging pattern; do not log from pure equipment constraint calculations.

### Phase 2: Accessibility Foundation

- [ ] Task 5: Remove interactive descendants from `<summary>` headers without redesigning the workbench shell.

  Deliverable: move current summary-embedded actions and toggles, such as view toggles, SVG/CSV/download actions, and add-equipment action, out of `<summary>` descendants into local adjacent header/action containers that preserve the same panel order, labels, IDs, and proximity to their views. Keep the current `details` panels and first-level workbench sequence. It is acceptable for local actions to be inside the expanded panel body if this is the smallest valid markup change; do not introduce a top project toolbar or full workbench shell in this increment. Ensure repeated visible labels such as `Скачать SVG` get distinct accessible names through `aria-label`, nearby text, or equivalent context. Remove or simplify the `main.ts` click `stopPropagation()` workaround for `.summary-action, .view-toggle-row` when it is no longer needed.

  Files: `index.html`, `src/app/styles.css`, `src/app/main.ts` only for obsolete summary-action event handling.

  Logging requirements: no new runtime logging is needed for static markup movement. If event wiring changes in `main.ts`, log only missing required elements through the existing required-element failure path; do not add routine click logs.

- [ ] Task 6: Make focus, disabled, and target states consistent across existing controls. (depends on Task 2)

  Deliverable: use the new focus and disabled tokens for actual current controls: buttons, links, inputs, selects, summaries, compact actions, range controls, the visible JSON upload button, the hidden file input boundary, and generated equipment controls. Keep native controls. Ensure visible target size does not regress below the current mobile behavior and prefer tokenized `min-height`/spacing over one-off values. This is not a mobile-flow task. Do not invent new disabled/running workflow behavior; only style native `:disabled`, existing hidden states, and token placeholders.

  Files: `src/app/styles.css`, `index.html` if static controls need attributes, `src/modules/ui/equipment.ts` if generated controls need accessible attributes.

  Logging requirements: CSS/accessibility attribute changes should not add runtime logs. If generated equipment controls add `aria-describedby`/IDs, do not log ID generation; tests should verify deterministic output.

- [ ] Task 7: Add deterministic safe equipment accessibility IDs. (depends on Task 5)

  Deliverable: create a narrow helper for generated equipment row accessibility IDs that is safe for arbitrary imported `EquipmentItem.id` values. Do not put raw IDs directly into `id` attributes or CSS selectors unless they are escaped/sanitized for that exact context. Use the helper to assign deterministic IDs for row label/status/issues elements, avoid collisions, and preserve `data-equipment-id` behavior used by current event delegation. Keep this as UI adapter work only; do not change equipment IDs, persistence, reducer behavior, or JSON.

  Files: `src/modules/ui/equipment.ts`, `src/modules/ui/equipment.test.ts`.

  Logging requirements: helper must be pure and logger-free. Do not log generated IDs or equipment names. Tests should cover imported IDs with spaces or punctuation if the helper transforms them.

- [ ] Task 8: Add accessible status relationships for existing notices, equipment rows, and canvas-like surfaces. (depends on Tasks 4 and 7)

  Deliverable: keep `#project-import-notice` as the success/migration live region and ensure its classes use semantic tokens. Preserve current alert behavior for invalid JSON/read failures unless this task also updates the relevant Playwright dialog expectations; do not create a new notification/diagnostics system. For equipment rows, link visible issue text/status to row controls with deterministic IDs and `aria-describedby` where practical without turning the row into a new inspector or selection model. Ensure duplicate labels like `Масса, кг` remain understandable in row context. Keep WebGL fallback as `role="status"` and style it via semantic tokens. Add concise fallback/description text for existing canvas-like surfaces where this can be done locally without CAD-lite viewport controls or new interaction models.

  Files: `index.html`, `src/app/main.ts`, `src/modules/ui/equipment.ts`, `src/app/styles.css`.

  Logging requirements: keep live-region updates concise and do not log normal status announcements. If import/render notice code receives an unknown semantic token, log a `WARN [ui.status]` once per update path with the token name, not project data.

### Phase 3: Rendering Status Alignment And Verification

- [ ] Task 9: Align 2D/3D equipment status colors with the semantic token model at adapter boundaries. (depends on Tasks 3 and 4)

  Deliverable: replace scattered hard-coded equipment status colors in Canvas/Three.js adapters with a small pure rendering status color map that mirrors the semantic token names and existing domain severity. Do not make `src/modules/rendering/*` import from `src/modules/ui/*`, and do not make Canvas/Three.js depend on runtime DOM/CSS custom property reads. CSS tokens and TS rendering colors should be mirrored by semantic names, tests, and docs. Do not change geometry sampling, containment, mesh generation, clipping, camera behavior, or equipment status derivation. The visual result should keep current warning/error meaning while making adapter colors traceable to the UI status vocabulary.

  Files: `src/modules/rendering/canvas2d.ts`, `src/modules/rendering/equipment3d.ts`, `src/modules/rendering/scene3d.ts` if status material assignment needs a narrow import, plus a narrow rendering adapter helper if needed such as `src/modules/rendering/statusColors.ts`.

  Logging requirements: keep pure color maps logger-free. Preserve existing scene status summary logging if present, but do not add per-frame or per-mesh logs. Unknown status fallback, if needed, should be `DEBUG [rendering.status]` and never run inside animation/frame loops.

- [ ] Task 10: Add focused tests and docs updates for the semantic/accessibility foundation. (depends on Tasks 1-9)

  Deliverable: update or add tests that assert required DOM IDs still cover all `requiredElement()` bindings, no interactive descendants remain inside `<summary>`, status labels remain text-visible, semantic status class/token mapping works, existing domain compatibility classes are preserved or intentionally migrated, equipment issue text is accessible without relying on color, safe equipment accessibility IDs handle arbitrary imported IDs, and import/WebGL live regions keep their status roles. For no-interactive-descendants checks, use Playwright real DOM assertions in `tests/e2e/import-export.spec.ts` or dependency-free string/regex checks in Vitest; do not add a DOM parser dependency just for this increment. Add rendering color-map tests if Task 9 introduces a helper. Add or update documentation so future plans know the token names, status rules, CSS/TS mirroring policy, scope boundaries, and that this increment intentionally did not implement workbench shell redesign, equipment selection, CAD-lite viewport, mobile flow, public hero redesign, framework change, formulas, `ProjectInputs`, or JSON schema changes.

  Files: `src/app/dom-contract.test.ts`, `src/modules/ui/equipment.test.ts`, `src/modules/ui/metrics.test.ts`, rendering tests such as `src/modules/rendering/equipment3d.test.ts` if color/material mapping changes, `tests/e2e/import-export.spec.ts` only for targeted accessible-flow assertions, `DESIGN.md`, `docs/ui-ux.md`, and optionally `docs/design/impeccable-analysis.md` only if it needs a follow-up status note rather than rewriting the audit.

  Logging requirements: tests should assert logging stays absent from new pure helpers where relevant. Do not add test-only logging. Documentation should describe intended DEBUG/WARN boundaries for future implementers, especially that pure geometry/equipment calculations and new mapping/color helpers remain logger-free.

## Verification Gates

- `npm run test`
- `npm run test:e2e` with targeted checks for import/export regressions, no interactive descendants inside `summary`, and any new focus/status smoke added in Task 10.
- `npm run check:encoding`
- `npm run build`

## Acceptance Criteria

- Semantic status tokens exist and cover `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, and `running` without changing domain status codes.
- The exact domain-to-semantic mapping is documented and tested: `ok -> normal`, `intersects -> warning`, `outsideHull -> error`, `invalidEquipment -> error`.
- Existing equipment, balance, import success/migration, fallback, Canvas, and Three.js status presentation is traceable to the shared semantic vocabulary without creating UI/rendering module cycles.
- Statuses remain understandable through text or accessible labels, not color alone.
- No interactive controls remain inside `<summary>` headers, and repeated export button labels have distinct accessible names.
- Equipment row status/issues are linked with deterministic safe IDs, without changing persisted equipment IDs or event delegation contracts.
- Existing workbench panel order, required DOM IDs, Russian labels, Body/SNAME-NED terminology, equipment-only balance disclaimer, export proximity, and current application-state boundaries are preserved.
- No changes are made to calculation formulas, `ProjectInputs`, persistence JSON schema, migrations, geometry contracts, UI framework, equipment selection, CAD-lite viewport, mobile flow, or public hero design.
