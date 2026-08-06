# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are engineers and technical specialists evaluating early underwater vehicle hull geometry, 2D/3D visualization, equipment placement, and exportable project data during sketch and concept development.

## Product Purpose

Underwater Vehicle Designer is a browser-based engineering workbench for building 2D/3D hull outlines, checking basic equipment layout, viewing station data, and exporting project artifacts as JSON, SVG, CSV, and theoretical drawing SVG.

Success means a technical user can rapidly change principal dimensions, inspect the resulting hull and equipment layout, understand visible diagnostics, and export reproducible data without installing a CAD package.

## Positioning

The product is an engineering product surface first. The public hero is a secondary, restrained brand surface that introduces the demo without replacing the operational workbench.

The product is not a full CAD/CAE system and is not a validated full hydrostatics suite. Current balance is equipment-only and must not be represented as a complete watertight-envelope hydrostatic calculation.

## Operating Context

The product is used during sketch and conceptual design, where fast iteration, visible assumptions, coordinate clarity, and export traceability matter more than polished CAD-like direct manipulation.

The UI uses Body/SNAME-NED coordinates: X toward the bow, Y starboard, Z down, with metric units from the hull center.

## Capabilities and Constraints

- Vite + TypeScript frontend-only application.
- Canvas 2D profile rendering, Three.js hull view, theoretical drawing canvas, station table, equipment editor, equipment-only balance diagnostics, and JSON/SVG/CSV exports.
- Geometry modes are `current-formula` and legacy DSNP_PA traceability mode.
- Engineering calculations must remain reproducible and separated from DOM, Canvas, Three.js, persistence, and export adapters.
- The product should not imply unsupported CAD/CAE capability, unvalidated hydrodynamics, full hydrostatics, direct manipulation tools, or production certification.

## Brand Commitments

The durable character is precise, engineering-oriented, calm, and technological. Avoid generic SaaS dashboard language and exaggerated marketing claims.

Anti-references for future design work:

- generic SaaS dashboard;
- glassmorphism;
- cards inside cards;
- marketing exaggeration;
- pseudo-CAD interfaces with visible but non-working tools.

## Evidence on Hand

- `index.html` contains the current public hero, workbench structure, coordinate convention, equipment-only balance disclaimer, and export controls.
- `src/app/styles.css` contains the current visual system tokens and responsive layout.
- `docs/ui-ux.md` documents the intended UI structure and UX rules.
- `docs/architecture/ui-refactoring-context.md` documents current UI architecture boundaries and open UI decisions.
- `src/app/dom-contract.test.ts` and `tests/e2e/import-export.spec.ts` define current DOM and Playwright behavior contracts.

Do not fabricate customers, benchmarks, certifications, testimonials, or validated hydrostatic capability.

## Product Principles

- Preserve engineering honesty over visual drama.
- Keep product-specific proof visible: real hull render, coordinate system, modes, diagnostics, and exports.
- Make every visual status explain a calculation or workflow state.
- Treat mobile as presentation, inspection, and export first unless the owner confirms full mobile editing.
- Keep public brand surfaces restrained; the workbench remains the primary product experience.
