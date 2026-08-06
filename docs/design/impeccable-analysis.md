# Impeccable Design Analysis

Date: 2026-08-05

Scope: read-only design critique, technical audit, detector classification, and planning input for future AI Factory plans. Product code was not changed.

## Sources Reviewed

- `AGENTS.md`
- `.ai-factory/ARCHITECTURE.md`
- `.ai-factory/RESEARCH.md`
- `.ai-factory/ROADMAP.md`
- `docs/architecture/ui-refactoring-context.md`
- `docs/ui-ux.md`
- `index.html`
- `src/app/styles.css`
- `src/app/dom-contract.test.ts`
- `tests/e2e/import-export.spec.ts`
- UI tests in `src/modules/ui/*.test.ts`

## Critique Results

### Public Hero

Score: 25/32. H7 and H10 treated as not applicable for this persuasive surface.

Verdict: high product specificity. The real Three.js screenshot, abyssal engineering styling, formula cue, export proof, and restrained CTA structure are substantially more specific than a generic SaaS hero.

Strengths:

- Real product render in the hero builds trust and avoids pseudo-CAD decoration.
- Primary CTA and secondary visualization link create a clear public-demo path.
- Dark marine console tone fits underwater engineering without becoming loud.

Issues:

- P1: Mixed public-demo and expert-console labels compete: `Public Demo v1`, `REAL 3D MODEL RENDER`, `STATIC HERO SNAPSHOT`, and Russian copy need one calmer proof hierarchy.
- P2: CTA jumps directly into dense controls without a first-task bridge.
- P2: Formula proof looks rigorous but does not explain mode/provenance.
- P3: Mobile hero is content-heavy before the actual tool.

### Engineering Workbench

Score: 26/40.

Verdict: operationally honest and domain-specific, but cognitively dense. It reads as all-controls-at-once rather than a guided engineering workflow.

Strengths:

- First-level access to dimensions, 2D, 3D, equipment, balance, drawing, and stations matches the documented UI intent.
- Body/SNAME-NED coordinate strip is correctly prominent.
- Export actions remain near the corresponding views.

Issues:

- P1: Too many primary decisions are visible at once across dimensions, geometry mode, water density, import/export, 2D toggles, 3D section controls, equipment, drawings, and stations.
- P1: Runtime derive/render status is underdeveloped; architecture notes already identify this risk.
- P2: Interactive controls inside `summary` create accessibility and accidental-disclosure risks.
- P2: `Размерения` lacks visual grouping for hull geometry, method, water/balance, and project-file actions.
- P3: No compact engineering summary of current principal dimensions after edits.

### 3D Block

Score: 24/40.

Verdict: domain-relevant but still closer to a generic Three.js viewer than a CAD-lite viewport.

Strengths:

- Two view modes are simple and useful: solid and x-ray.
- Section controls are independent of rendering mode.
- 3D fallback keeps the app useful when WebGL is unavailable.

Issues:

- P1: Section position/plane/offset controls remain visible when section is disabled.
- P1: No visible camera reset, orientation cube, view presets, or reproducible view readout.
- P2: In-canvas hint `DRAG TO ORBIT` is English-only.
- P2: Opacity slider has no numeric value for reproducibility.
- P2: Canvas label does not expose current 3D mode, section state, or textual equivalent.

### Equipment And Diagnostics

Score: 23/40.

Verdict: useful and domain-specific, but diagnostics are row-local and not yet a mature engineering inspection system.

Strengths:

- Equipment fields expose Body X/Y/Z directions.
- Statuses are explicit: `Норма`, `Вне корпуса`, `Пересечение`, `Ошибка данных`.
- Balance disclaimer correctly protects against full-hydrostatics overclaim.

Issues:

- P1: Desktop equipment row is a wide spreadsheet strip; efficient for one row, hard to scan across many items.
- P1: No central diagnostic queue linking row issues, 2D/3D overlays, and balance warnings.
- P1: Delete has no visible undo/recovery path.
- P2: Equipment selection is absent across list, 2D, and 3D.
- P2: Statuses rely heavily on color and terse labels.

## Technical Audit

Score: 15.5/20, Good.

| Dimension | Score | Key Finding |
| --- | ---: | --- |
| Accessibility | 2.5/4 | Interactive descendants in `summary`, pointer-only 3D, contrast/touch target gaps |
| Performance | 3.5/4 | Small hero asset and capped 3D pixel ratio; minor browser polish remains |
| Theming | 3/4 | Strong token base, but light-only and some hard-coded values |
| Responsive Design | 3.5/4 | Mobile avoids document overflow; some controls under 44px |
| Implementation Integrity | 3/4 | Good DOM/E2E contracts; tests still miss valid structure and a11y semantics |

P0 findings: none.

P1 findings:

- Interactive controls inside `summary` in `index.html` around panel headers create invalid/confusing disclosure controls.
- 3D viewport is mouse/touch-only with no keyboard equivalent.

P2 findings:

- Mobile touch targets render at 38-42px in several controls.
- Low-emphasis metadata likely misses 4.5:1 contrast in places.
- Canvas graphics have labels but no structured fallback content.
- Playwright coverage is Chromium-only and mostly functional.
- DOM contract tests are mostly brittle string checks.

P3 findings:

- No favicon declaration.
- Light-only theming is intentional now, but dark mode is not supported.

Positive implementation signals:

- `lang="ru"`, viewport meta, description, and theme color are present.
- Native labels wrap many inputs.
- Import notice uses `role="status"` and `aria-live="polite"`.
- Global `:focus-visible` styling exists.
- Responsive breakpoints are practical and the current mobile E2E overflow check is valuable.
- WebGL pixel ratio is capped.
- Existing Playwright web-server setup is clean.

## Detector Results

Command run:

```bash
npx impeccable detect "index.html" "src/app/styles.css"
```

Findings:

| Rule | Location | Classification | Rationale | Suggested Narrow Ignore |
| --- | --- | --- | --- | --- |
| `side-tab` | `src/app/styles.css:930` | Conscious design-system decision, with risk | The left accent on equipment rows communicates equipment status and row identity. It is not generic decoration, but the 3px side border is visually close to an AI-pattern tell. | Ignore only `.equipment-row { border-left: 3px solid var(--teal); }` if the owner confirms left-edge status accent as intentional. Do not ignore `side-tab` globally. |
| `overused-font` | `src/app/styles.css:204` | Recommendation | `Arial Narrow`/`Roboto Condensed` fallback gives the hero a condensed technical voice, but it is not a confirmed distinctive type direction and local font assets exist for future exploration. | No ignore recommended yet. Resolve via owner decision on typography before future implementation. |
| `codex-grid-background` | `src/app/styles.css:43` | Conscious design-system decision, possibly narrow false positive | The global subtle grid supports engineering/measurement context, and grids also appear in real visualization surfaces. However, decorative grid backgrounds are a known generic generated-UI pattern. | If kept, ignore only the `body::before` two-axis background grid or only global page grid usage. Do not ignore grids in detector globally because real canvas/blueprint grids remain valid review targets. |

No real blocker defect was found by detector. The actionable real defects came from audit: `summary` structure, pointer-only 3D, touch targets, contrast, canvas alternatives, and test coverage gaps.

## Mapping To Eight Directions

| Direction | Findings Link | Brief Link | Planning Priority |
| --- | --- | --- | --- |
| Real 3D hero | Hero should keep real proof, but static snapshot can evolve | `briefs/public-mvp-presentation.md` | P1 |
| Unified visual system | Missing tokens and detector classifications need system decisions | `briefs/cad-lite-workbench-3d.md` | P0 |
| Clear workbench | Density, grouping, runtime status, `summary` actions | `briefs/cad-lite-workbench-3d.md` | P0 |
| Engineering highlights | Formula/mode/provenance and current dimensions need explanation | `briefs/public-mvp-presentation.md` | P1 |
| Visual statuses | Distributed warnings and missing semantic status tokens | `briefs/equipment-empty-diagnostics.md` | P0 |
| 3D polish | View controls, section disclosure, keyboard equivalent, Russian hint | `briefs/cad-lite-workbench-3d.md` | P1 |
| Equipment list | Wide spreadsheet row, no selection, no central issue queue | `briefs/equipment-empty-diagnostics.md` | P0 |
| Mobile presentability | No overflow but long serial workbench | `briefs/mobile-demo-export-flow.md` | P1 |

## AI Factory Planning Input

### Confirmed Decisions

- Product register is Product, not pure marketing landing page.
- Public hero is secondary restrained brand surface.
- Audience is engineers and technical specialists.
- Primary usage stage is sketch and concept development.
- Product must not claim full CAD/CAE or validated full hydrostatics.
- Character is precise, engineering-oriented, calm, and technological.
- Anti-references: generic SaaS dashboard, glassmorphism, cards inside cards, marketing exaggeration, pseudo-CAD with non-working tools.
- Preserve application architecture boundaries: UI/rendering consume `ProjectInputs`, `ProjectEvaluationPublication`, and `ProjectViewState`; no geometry recalculation in UI.
- Keep balance equipment-only disclaimer.
- Keep Body/SNAME-NED terminology and Russian operational labels.

### Choices Requiring Owner Decision

- Next design priority: public MVP presentation, clear workbench, CAD-lite interaction, or mobile demo/export.
- Static real hero render versus real interactive/recorded 3D hero.
- Typography direction: keep system stack or adopt local fonts from `design-assets/fonts/`.
- Mobile scope: inspect/export-first or full editing parity.
- Selection, camera, panel collapse, dirty state, and autosave persistence model.
- Whether left-edge equipment status accents are a confirmed system motif.
- Whether visual regression should become a gate before major public redesign.

### Dependencies

- Do not change engineering formulas or `ProjectInputs` for visual work.
- Future 3D interaction depends on view/session state ownership decisions.
- Equipment selection depends on a selection contract across list, 2D, and 3D.
- Central diagnostics depends on stable diagnostic codes/messages strategy if future work crosses core/UI boundary.
- Mobile export flow depends on current JSON/SVG/CSV export contracts and Playwright download behavior.

### Priority Buckets

P0:

- Clear workbench grouping and diagnostics hierarchy.
- Fix invalid/confusing disclosure header action model in future UI work.
- Unified semantic status token model.
- Equipment list/diagnostic queue brief refinement before implementation.

P1:

- 3D viewport polish: reset, orientation, section controls, keyboard/text equivalent.
- Mobile demo/export path.
- Public hero proof hierarchy and engineering highlights.
- Detector decisions for grid and equipment side accent.

P2:

- Favicon and minor metadata polish.
- Dark-mode/theming exploration if product owner wants it.
- Advanced CAD-like direct manipulation, undo/redo, multi-project workspace.

### Recommended Sequence

1. Confirm design priorities and owner decisions from this document.
2. Plan a visual-system/token pass without changing formulas or application contracts.
3. Plan workbench clarity and diagnostics as the first implementation slice.
4. Plan CAD-lite 3D viewport polish after view/session state decisions.
5. Plan equipment list and diagnostic queue with selection model if confirmed.
6. Plan mobile demo/export as inspect/export-first unless full mobile editing is explicitly chosen.
7. Plan public hero improvements only after deciding static versus real 3D hero.

### Visual Acceptance Criteria

- UI remains recognizably engineering, calm, and product-specific.
- Hero uses real product evidence and does not overclaim capability.
- Workbench first screen makes the primary task and current system status clear.
- All status colors are paired with text and centralized where appropriate.
- 3D controls are reproducible and include a keyboard/text equivalent.
- Equipment issues can be understood without relying on row color alone.
- Mobile has no horizontal document overflow and has a coherent inspect/export path.
- Russian UI text remains intact and encoding checks pass.

### Necessary Playwright Checks

- Existing import/export round-trip, reset, invalid JSON, SVG/CSV/theoretical export, and mobile overflow checks remain passing.
- Add no interactive descendants inside `summary` assertion.
- Add keyboard tab/focus/disclosure smoke.
- Add 3D keyboard fallback or textual equivalent check when implemented.
- Add mobile target-size audit for visible controls.
- Add reduced-motion smoke.
- Add contrast checks for small muted metadata.
- Add screenshot or visual regression only after owner approves visual-gate scope.
