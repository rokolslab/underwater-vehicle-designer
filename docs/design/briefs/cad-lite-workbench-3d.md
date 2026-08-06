# Design Brief: CAD-Lite Workbench And Central 3D Viewport

## Job And Audience

Audience: engineers iterating principal dimensions, visual modes, sections, and equipment placement during conceptual work.

Visitor mode: Operate.

## Outcome And Proof

Primary outcome: the user sees what changed, understands current geometry/view state, and can reproduce a 2D/3D inspection without trusting hidden calculations.

Product-specific proof:

- Body/SNAME-NED coordinates remain visible;
- geometry modes remain product-labeled;
- 2D, 3D, table, and exports consume shared `ProjectEvaluation` data;
- section controls use Body coordinate ranges and do not recalculate geometry locally.

## Selected Direction

Evolve from all-controls-at-once into a clear engineering workbench. Keep the light panel system, numbered sections, and native controls, but introduce stronger grouping, visible runtime state, and a more professional 3D viewport control model.

The 3D viewport should feel CAD-lite, not pseudo-CAD: only show controls that work, keep view presets/reset reproducible, and expose section state clearly.

## Scope And Boundaries

No formula, persistence, or architecture contract changes are implied by this brief.

Do not combine framework migration with visual redesign. Do not add direct manipulation unless selection/view state ownership is decided.

## States And Ranges

States to design:

- clean publication;
- derive/render error using last successful publication;
- 3D unavailable fallback;
- section disabled versus active;
- x-ray versus solid;
- mobile stacked control state.

## Interaction And Layout

Workbench should separate hull inputs, method/provenance, water/balance settings, project file actions, and view settings.

3D should provide a visible mode summary, section summary, reset/preset affordance, numeric opacity value, Russian interaction hints, and keyboard/text equivalent when implemented.

## Constraints And Open Decisions

Owner decisions needed: camera persistence, selected equipment model, whether 3D becomes central viewport or stays paired with 2D, and mobile editing ambition.
