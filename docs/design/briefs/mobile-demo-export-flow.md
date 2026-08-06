# Design Brief: Mobile Demo And Export Flow

## Job And Audience

Audience: technical evaluator opening the public demo on a phone to inspect capability, adjust a small number of values, and export/share project artifacts.

Visitor mode: Operate with presentation constraints.

## Outcome And Proof

Primary outcome: mobile remains credible and useful without pretending to provide full CAD parity.

Product-specific proof:

- no horizontal document overflow;
- dimensions and principal views are reachable;
- add equipment remains possible;
- exports remain accessible;
- 3D fallback and long drawing scroll remain understandable.

## Selected Direction

Mobile should be inspect/export-first unless the owner explicitly confirms full mobile editing parity. The flow should prioritize opening the workbench, seeing current hull/3D status, adding or inspecting a minimal equipment item, and exporting JSON/SVG/CSV.

## Scope And Boundaries

No implementation. No product-code changes. Do not redesign as a separate mobile app or native interface.

Avoid hiding engineering truth just to make mobile shorter. Instead, sequence panels and summaries so the user can inspect before editing.

## States And Ranges

States to design:

- first mobile visit;
- collapsed and expanded panels;
- no equipment;
- one equipment item;
- export success/download;
- 3D unavailable;
- reduced motion.

## Interaction And Layout

Use one-column flow with strong panel summaries, large enough touch targets, visible current-state summaries, and export actions near each representation.

Theoretical drawing may remain horizontally scrollable if labelled clearly; do not force unreadable downscaling.

## Constraints And Open Decisions

Owner decisions needed: inspect/export-first versus full edit parity, mobile hero length, mobile 3D expectations, and whether Playwright mobile visual regression should become a gate.
