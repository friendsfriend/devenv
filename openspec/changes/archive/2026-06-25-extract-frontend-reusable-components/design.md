## Context

The TUI frontend already has shared primitives such as `GenericModal`, `ListViewModal`, `ScrollableList`, `Table`, and `statusUtils`. Several view components still duplicate the same layout and state rendering: bordered containers, centered loading/error/empty messages, search headers, detail panels, date formatting, status colors, and text truncation.

This change is a frontend-only refactor. It must preserve visible behavior, parent-owned keyboard handling, standard help-menu keybinds, and existing public package exports unless an export is needed for reuse.

## Goals / Non-Goals

**Goals:**
- Reuse existing components before adding new ones.
- Extract minimal reusable components/utilities for duplicated patterns.
- Refactor high-duplication views without changing behavior.
- Keep components presentational and compatible with the single `useKeyboard` limitation.

**Non-Goals:**
- Redesign list/table behavior.
- Add new dependencies.
- Change keybinds, API clients, server code, or data models.
- Convert every view in one large rewrite.

## Decisions

- Reuse `ScrollableList`, `ListViewModal`, `GenericModal`, and `Table` where they already fit. Alternative: create a new table framework. Rejected because it adds abstraction before proving need.
- Add small components only for repeated JSX that appears in multiple views: centered state display, search header, and detail section/panel. Alternative: one large `DataListView`. Deferred unless the small pieces still leave obvious duplication.
- Put duplicated formatting/color helpers in existing shared utility files first, especially `statusUtils.ts`; add a tiny utility only if no existing home fits. Alternative: keep helpers colocated. Rejected where identical logic exists across files.
- Keep keyboard handling in parents. New reusable components must not introduce `useKeyboard`.

## Risks / Trade-offs

- Over-generalized components could make simple views harder to read → keep props narrow and extract only duplicated patterns.
- Visual regressions from shared layout defaults → refactor one pattern at a time and run frontend checks.
- Utility names could become vague dumping grounds → only move helpers with at least two current callers.
