---
archived: 2026-07-01
---

# Implementation Plan: Three.js Hull View

Branch: feature/threejs-hull-view
Created: 2026-07-01

## Settings
- Testing: yes
- Logging: standard
- Docs: no

## Roadmap Linkage
Milestone: "Build 3D hull view with Three.js"
Rationale: This is the next product milestone after CVK/cylindrical insert support; the 3D layer is required before equipment placement, placement constraints, and balance calculations.

## Context
The project is split into app, geometry, rendering, persistence, ui, and shared modules. Hull geometry and CVK are available through the shared ProfileSnapshot. Canvas, table, metrics, SVG, and CSV already use this snapshot. Three.js must remain a rendering adapter, not a new source of engineering geometry.

Hard constraints:
- Do not move radius or CVK formulas into Three.js code.
- Do not recalculate profile geometry in UI/rendering when ProfileSnapshot already has the data.
- Keep mesh generation separate from the DOM/WebGL scene so it can be tested with Vitest.
- Do not use CV as an abbreviation for the cylindrical insert; CV means center of buoyancy in balance work.

## Commit Plan
- Commit 1 (after tasks 1-3): feat: add threejs hull mesh foundation
- Commit 2 (after tasks 4-6): feat: render interactive 3d hull view
- Commit 3 (after tasks 7-8): test: verify threejs hull view integration

## Tasks

### Phase 1: Three.js dependency and pure 3D mesh data
- [x] Task 1: Add runtime dependency three and TypeScript declarations.
  - Files: package.json, package-lock.json.
  - Expected behavior: Vite/TypeScript builds Three.js imports.
  - Logging requirements: no runtime logging; final implementation output records dependency and build result.
  - Dependencies: none.

- [x] Task 2: Create pure revolved hull mesh data from ProfileSnapshot.
  - Files: src/modules/rendering/mesh.ts, src/modules/rendering/mesh.test.ts.
  - Expected behavior: build positions, indices, normals, and UVs from smoothPoints; hull axis is x; radius revolves in y/z; CVK is preserved as a constant-radius section from snapshot.
  - Logging requirements: no logging inside the pure function; tests cover segment counts, endpoint x coordinates, zero nose/stern radius, and max-radius CVK section.
  - Dependencies: Task 1.

- [x] Task 3: Add Vitest regressions for the 3D mesh contract.
  - Files: src/modules/rendering/mesh.test.ts.
  - Expected behavior: tests confirm the mesh uses snapshot.extents.totalLength, keeps endpoints, and creates no negative/NaN radii.
  - Logging requirements: no runtime logging; assertions must be diagnostic.
  - Dependencies: Task 2.

### Phase 2: Three.js rendering adapter
- [x] Task 4: Create scene3d adapter with lifecycle.
  - Files: src/modules/rendering/scene3d.ts.
  - Expected behavior: adapter creates Scene, PerspectiveCamera, WebGLRenderer, lighting, hull material, wireframe overlay, and public render(snapshot), resize(), dispose() methods.
  - Logging requirements: logger.debug for scene creation, resize, and mesh replacement; logger.warn only for diagnosable WebGL/container problems.
  - Dependencies: Tasks 1-3.

- [x] Task 5: Add basic 3D view interaction independent of engineering logic.
  - Files: src/modules/rendering/scene3d.ts.
  - Expected behavior: user can rotate model with drag and zoom with wheel; camera frames the hull when ProfileSnapshot changes.
  - Logging requirements: do not log every pointer event; log only controls initialization and critical errors.
  - Dependencies: Task 4.

### Phase 3: UI integration
- [x] Task 6: Add a 3D panel in HTML/CSS without breaking the 2D workflow.
  - Files: index.html, src/app/styles.css.
  - Expected behavior: the first screen remains an engineering workbench; 2D canvas and 3D view are in a clear visualization area and do not overlap on desktop/mobile; coordinate table remains accessible.
  - Logging requirements: no runtime logging; visual state is checked by build and browser smoke.
  - Dependencies: Task 4.

- [x] Task 7: Wire scene3d into src/app/main.ts.
  - Files: src/app/main.ts.
  - Expected behavior: each update() renders 2D canvas, table, metrics, and 3D from the same currentSnapshot; window resize updates canvas and 3D renderer.
  - Logging requirements: use existing logger.debug update flow; add concise 3D render/resize debug events without frame logs.
  - Dependencies: Tasks 4-6.

### Phase 4: Verification and context
- [x] Task 8: Run quality gates and update project context where needed.
  - Files: .ai-factory/DESCRIPTION.md, AGENTS.md.
  - Expected behavior: npm run test, npm run build, and npm run check:encoding pass; project context reflects the Three.js dependency and rendering files.
  - Logging requirements: final implementation output lists pass/fail for each check; no separate report file.
  - Dependencies: Tasks 1-7.

## Acceptance Criteria
- 3D hull is built from the same ProfileSnapshot as 2D canvas, SVG, CSV, table, and metrics.
- Changing L, D, lambda, CVK, and station count updates the 3D model without page reload.
- CVK visually appears as a cylindrical constant-radius section.
- Mesh generation is covered by Vitest tests as pure rendering-layer geometry.
- Production build passes without TypeScript errors.
- Browser UI remains usable on desktop and mobile widths without incoherent overlap.

## Verification Notes
- npm run test: passed, 22/22 tests.
- npm run build: passed; Vite warns that the main chunk is larger than 500 kB after adding Three.js.
- npm run check:encoding: passed, 0 warnings/errors.
- Desktop browser smoke: WebGL canvas rendered nonblank, and drag changed the frame.
- Mobile visual screenshot: passed at 390x844; 3D panel rendered without horizontal overflow and the coordinate table remained accessible below it.
