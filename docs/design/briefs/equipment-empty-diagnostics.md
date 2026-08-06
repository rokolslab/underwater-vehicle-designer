# Design Brief: Equipment, Empty State, And Diagnostics

## Job And Audience

Audience: engineers placing equipment, reading constraint status, and checking equipment-only balance risk.

Visitor mode: Operate.

## Outcome And Proof

Primary outcome: the user can add equipment, understand what is wrong, and know which issue to fix first.

Product-specific proof:

- equipment rows keep Body X/Y/Z directions;
- statuses remain explicit Russian labels;
- balance stays equipment-only and experimental until validated hydrostatics exists;
- diagnostics connect equipment list, 2D/3D visualization, and balance warnings.

## Selected Direction

Move from row-local warning labels to a calm engineering diagnostics model: empty state with first action, per-item status with explanation, and a central issue queue ordered by severity.

The equipment list may remain dense on desktop, but it should not become a generic data grid. It needs selection, issue linking, and readable status rhythm before adding bulk CAD-like tools.

## Scope And Boundaries

Brief only. No command/reducer changes are assumed unless implementation later confirms selection, undo, duplicate, or batch edit.

Do not represent equipment-only displaced volume as full vehicle hydrostatics.

## States And Ranges

States to design:

- no equipment;
- one valid item;
- multiple valid items;
- outside hull;
- intersections;
- invalid dimensions/data;
- mixed warnings;
- delete/recovery or undo decision.

## Interaction And Layout

Desktop: support scanning many items without losing field labels. Mobile: treat each item as an inspect/edit card, not a cramped spreadsheet.

Diagnostics should be text-first with color support, not color-only. Issue rows should have enough context to identify item, problem, location, and next action.

## Constraints And Open Decisions

Owner decisions needed: selected equipment state ownership, delete recovery expectation, whether central diagnostics are panel-local or global, and whether stable diagnostic codes should precede UI changes.
