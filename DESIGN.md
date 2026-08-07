---
name: Underwater Vehicle Designer
description: Restrained engineering workbench for underwater vehicle hull geometry, equipment layout, diagnostics, and export.
colors:
  abyss: "#07191f"
  abyss-soft: "#0d2830"
  paper: "#edf1ec"
  panel: "#fbfcf8"
  panel-soft: "#f4f7f2"
  ink: "#14262c"
  muted: "#66777b"
  line: "#d7ded7"
  line-strong: "#aab8b2"
  teal: "#0b7f77"
  teal-deep: "#075f59"
  cyan: "#75d9d0"
  signal: "#b8e24a"
  amber: "#c77c21"
  rose: "#bd3454"
  wash: "#e4f1ed"
typography:
  display:
    fontFamily: "Arial Narrow, Roboto Condensed, Segoe UI, sans-serif"
    fontSize: "clamp(2.6rem, 5.1vw, 5.25rem)"
    fontWeight: 740
    lineHeight: 0.95
    letterSpacing: "-0.052em"
  body:
    fontFamily: "Segoe UI Variable, Segoe UI, Helvetica, Arial, sans-serif"
  label:
    fontFamily: "Cascadia Mono, SFMono-Regular, Consolas, monospace"
rounded:
  xs: "3px"
  sm: "4px"
  md: "6px"
  lg: "13px"
  hero: "28px 28px 10px 10px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
  xl: "64px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    height: "38px"
  hero-cta:
    backgroundColor: "{colors.signal}"
    textColor: "#132315"
    rounded: "{rounded.sm}"
    height: "48px"
---

# Design System: Underwater Vehicle Designer

## Overview

**Creative North Star: "Abyssal Engineering Console"**

This document records the incumbent visual system found in `index.html` and `src/app/styles.css`. It is not a final owner-approved redesign target. Treat it as current visual authority for preservation, critique, and future planning until the owner confirms a new direction.

The current identity is a calm technical console: dark abyss hero, pale paper workbench, teal engineering accents, monospace metadata, tabular numbers, collapsible panels, and real hull visualization rather than decorative pseudo-CAD imagery.

**Key Characteristics:**
- Product-first engineering workbench with restrained public hero.
- Real visualization and coordinate proof over marketing decoration.
- Light operational surfaces with dark marine framing.
- Native controls and explicit labels instead of custom faux-CAD widgets.

## Colors

The palette combines deep marine framing with quiet paper work surfaces and a limited diagnostic accent set.

### Primary
- **Abyss Base** (`abyss`): dark public hero and page backdrop.
- **Operational Teal** (`teal`, `teal-deep`): primary workbench actions, focus accents, active borders, and engineering highlights.

### Secondary
- **Instrument Cyan** (`cyan`): technical metadata, axis labels, grid accents, and low-intensity hero detail.
- **Signal Lime** (`signal`): rare hero emphasis and primary public CTA. It should stay scarce.

### Tertiary
- **Diagnostic Amber** (`amber`): experimental and warning states.
- **Diagnostic Rose** (`rose`): invalid, outside-hull, destructive, and high-risk states.

### Neutral
- **Paper Field** (`paper`): page workbench background.
- **Panel White** (`panel`): primary surfaces.
- **Soft Panel** (`panel-soft`): subdued controls and empty states.
- **Ink** (`ink`): main text.
- **Muted Technical Text** (`muted`): secondary labels.
- **Line / Strong Line** (`line`, `line-strong`): panel and control boundaries.

**The Scarce Signal Rule.** `signal` is a hero emphasis color, not a general success token. Future status systems should not use lime as a generic “ok” state unless the owner confirms it.

## Typography

**Display Font:** `Arial Narrow`, `Roboto Condensed`, `Segoe UI`, sans-serif fallback.
**Body Font:** `Segoe UI Variable`, `Segoe UI`, Helvetica, Arial, sans-serif.
**Label/Mono Font:** `Cascadia Mono`, `SFMono-Regular`, Consolas, monospace.

**Character:** The incumbent typography is pragmatic and system-native. Its strength is legibility and numeric stability; its weakness is that the display stack is not yet a confirmed distinctive brand choice.

### Hierarchy
- **Display**: condensed, heavy, tight headline used only in the public hero.
- **Headline / Title**: compact bold panel titles with numeric section markers.
- **Body**: system sans for Russian interface copy and labels.
- **Label / Numeric**: monospace for formulas, coordinate notes, exported-data cues, station counts, and balance values.

**The Tabular Trust Rule.** Engineering values should keep tabular-number treatment and units close to the value.

## Layout

The current layout is desktop-first but responsive: a two-column hero collapses to one column, 2D/3D panels sit side by side on wide screens and stack below `1220px`, form grids reduce from six columns to four, two, then one column.

Workbench panels are first-level and collapsible. UX-1 workbench shell now adds an upper project toolbar, compact engineering summary, explicit workbench zones, grouped hull controls, and local zone headings for viewport, equipment, diagnostics, export, and data. The layout remains desktop-first and responsive; future work should refine interaction depth without hiding critical engineering inputs or implying CAD-lite capability.

## Elevation & Depth

Depth is mostly tonal layering plus a small shadow vocabulary. Workbench panels use light surfaces and restrained shadows; the hero uses stronger ambient depth and inset framing for the real render. This is not glassmorphism as a system; the only blur-like treatment is localized to the hero visual frame.

### Shadow Vocabulary
- **Panel shadow** (`0 18px 48px rgba(13, 36, 40, 0.09)`): workbench cards and data bands.
- **Hero shadow** (`0 24px 80px rgba(1, 14, 19, 0.24)`): public brand surface only.

## Shapes

Shapes are precise and slightly technical: small-radius buttons and chips, medium-radius panels, and a distinctive hero shell radius. Avoid overly rounded SaaS cards. The form language should feel measured rather than soft.

## Components

### Buttons
- **Primary workbench buttons:** teal fill, white text, compact height, small radius.
- **Secondary buttons:** white background, strong line, ink text.
- **Destructive delete:** rose border and rose hover fill.
- **Hero CTA:** signal fill with dark text; public hero only.

### Panels
- Collapsible `details` panels are the main structural component.
- Numeric section markers (`01` through `07`) provide sequence and workbench identity.
- Interactive controls stay outside `summary` headers. Local actions sit in panel action rows or the upper project toolbar.
- Workbench zone headings separate parameters, viewport, equipment, diagnostics, and export/data without turning every zone into nested cards.

### Inputs
- Native number/select/range controls are retained.
- Labels include units and coordinate directions where relevant.
- Focus uses cyan/teal outline and box-shadow treatment.

### Statuses
- Equipment status uses row background, left accent, badge, and textual issues.
- Balance warning uses amber summary and an experimental disclaimer.
- UX-1 status foundation defines semantic statuses `normal`, `warning`, `error`, `experimental`, `selected`, `disabled`, `stale`, and `running` as CSS tokens in `src/app/styles.css` and a pure UI adapter contract in `src/modules/ui/statusTokens.ts`.
- Current DOM status presentation uses `data-ui-status="..."` and `ui-status--...` alongside compatibility classes such as `equipment-row--outsideHull` and `equipment-status--intersects`.
- Equipment domain statuses map as `ok -> normal`, `intersects -> warning`, `outsideHull -> error`, and `invalidEquipment -> error`; status labels remain visible text, not color-only signals.
- Canvas and Three.js rendering mirror the semantic status vocabulary through `src/modules/rendering/statusColors.ts` instead of importing UI/CSS tokens at runtime.

### Signature Components
- **Hero real render frame:** a static image from the actual Three.js scene with explicit caption that it is not decorative.
- **Axis convention strip:** Body/SNAME-NED memo placed between hero and workbench.
- **Project toolbar:** compact project-level JSON/reset operations and anchors to existing engineering zones. It is not a CAD ribbon.
- **Engineering summary:** read-only compact status surface fed by existing inputs and `ProjectEvaluation`, including equipment-only balance wording.
- **Theoretical drawing canvas:** horizontal scroll on small screens rather than forced downscaling.

## Do's and Don'ts

### Do:
- **Do** preserve the real 3D hero render as proof, or replace it only with another real product-derived render.
- **Do** keep Body/SNAME-NED coordinate clarity visible near controls, 3D sections, and equipment placement.
- **Do** preserve Russian UI terminology and avoid English-only operational hints.
- **Do** keep export actions near their corresponding views.
- **Do** keep equipment-only balance clearly marked as not full hydrostatics.

### Don't:
- **Don't** turn the product into a generic SaaS dashboard.
- **Don't** introduce glassmorphism, nested-card clutter, or decorative pseudo-CAD controls.
- **Don't** imply full CAD/CAE, full hydrostatics, or validated production analysis.
- **Don't** let UI adapters recalculate geometry or own engineering state.
- **Don't** treat detector findings as final truth without classifying project-specific intent.

## Current System Assessment

### Preserve
- Real product imagery in the hero.
- Dark marine hero plus light engineering workbench contrast.
- Teal/cyan technical accent vocabulary.
- Native controls with labels and units.
- Coordinate convention, geometry mode labels, balance disclaimer, and export proximity.
- DOM contracts around `#hull-scene-3d`, `#equipment-list [data-equipment-id]`, canvas IDs, import notice, and balance metrics.

### Conscious Identity
- Engineering-console atmosphere instead of generic business dashboard.
- Public hero as restrained secondary brand surface.
- Numbered workbench panels and monospace technical metadata.
- Real render caption that rejects decorative mockups.
- Diagnostic amber/rose status colors.

### Visual Debt
- Workbench density is lower after UX-1 shell grouping, but equipment rows and diagnostics are still dense for larger projects.
- 3D viewport lacks professional view controls, reset/orientation affordance, and accessible state summary.
- Equipment list behaves like a wide spreadsheet strip on desktop and a long form on mobile.
- Diagnostics are distributed rather than centralized.
- Mobile works structurally but is not yet a refined demo/export flow.

### Missing Tokens
- Surface elevation tokens beyond the two shadows.
- Breakpoint tokens and viewport mode names.
- Motion and reduced-motion tokens.
- Focus/selection tokens for future 2D/3D/equipment linkage behavior beyond the current token-only foundation.
- Canvas/3D overlay tokens for hull, equipment, selection, warning, and clipping states.
- Density tokens for compact desktop rows versus mobile inspection cards.

### UX-1 Semantic Foundation Scope

- Implemented: status tokens, focus/disabled/touch-target tokens, stable DOM status attributes/classes, equipment accessibility IDs, no interactive descendants inside `summary`, and local descriptions for current canvas-like surfaces.
- Implemented in the next UX-1 shell slice (since merged): project toolbar, compact engineering summary, workbench zones, grouped hull/method/calculation controls, clearer equipment/diagnostics/export boundaries, and targeted DOM/Playwright/encoding coverage.
- Not implemented: CAD-lite viewport controls, camera presets, pointer picking, mobile-specific flow, public hero redesign, UI framework change, calculation formulas, `ProjectInputs`, JSON schema, migrations, or runtime `stale`/`running` state.
- Implemented in UX-2 milestone: equipment selection (`WorkbenchInteractionState`), inspector, 2D/3D selection+hover overlays, central diagnostics queue with severity sorting and dedupe, delete confirmation, and mobile card responsiveness.

### Owner Decisions Required
- Whether the next UI goal is public MVP presentation, workbench clarity, CAD-lite interaction, or mobile demo/export.
- Whether mobile is inspect/export-first or full editing parity.
- Whether camera, selected equipment, panel state, dirty state, and autosave are session-only or persisted.
- Whether to keep the current font direction or use local design assets from `design-assets/fonts/`.
- Whether the detector warning for the equipment left accent is intentional enough to keep with a narrow ignore.
- Whether the hero should remain a static real render or evolve into a real 3D hero.
