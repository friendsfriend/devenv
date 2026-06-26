## Context

OpenTUI `ScrollBoxRenderable` supports `scrollX`, `scrollY`, horizontal and vertical scrollbars, `scrollLeft`, `scrollTop`, `scrollBy({ x, y })`, and `scrollTo({ x, y })`. This project already styles native scrollbars through `SCROLLBAR_OPTIONS` and uses horizontal scrolling in `LogModal`.

Keyboard input is parent-routed through the central dispatcher in `app-opentui.tsx` and context-specific handlers under `tui/packages/cli/src/tui/keyboard`. Existing reusable UI components must not introduce their own `useKeyboard` handlers because the app uses a single global keyboard routing model.

## Goals / Non-Goals

**Goals:**
- Provide a reusable way to configure native scrollboxes with consistent scrollbar styling and declared scroll axes.
- Enable horizontal scrolling for content panes that can reasonably overflow horizontally.
- Support `h`/`l` and `←`/`→` for horizontal scroll when horizontal keyboard scrolling is enabled.
- Standardize previous/next related navigation on `[`/`]` and `Shift+K`/`Shift+J`.
- Resolve known keybind conflicts and update help text.

**Non-Goals:**
- Make every view horizontally scrollable.
- Change script argument/script add modal value-editing behavior.
- Introduce per-component `useKeyboard` registrations.
- Redesign list selection, focus management, or terminal layout.
- Replace OpenTUI native scrollbars with custom scrollbar rendering.

## Decisions

- Add or adapt a reusable scrollable content primitive rather than editing every raw `<scrollbox>` independently. It should centralize `SCROLLBAR_OPTIONS`, scroll axis defaults, and ref forwarding while remaining presentational.
- Model scroll support as explicit axes. Callers should be able to allow vertical, horizontal, both, or neither, and keyboard scroll axes should be independently configurable where needed.
- Treat horizontal keyboard scrolling as one capability that includes both `h`/`l` and `←`/`→`.
- Keep keyboard dispatch in existing CLI keyboard handlers. Reusable UI components may expose refs/callbacks, but should not consume global keyboard events directly.
- Use `[`/`]` and `Shift+K`/`Shift+J` for previous/next related actions such as pages or files. `[`/`]` are the primary Vim-style previous/next bindings; `Shift+K`/`Shift+J` provide an additional vertical mnemonic.
- Make job stage navigation `Tab` only, freeing `h`/`l` and arrows from stage switching.
- Move issue detail label picker from `l` to `Shift+L`.
- Move branch selector lazygit branch log from `l` to `Shift+L`.
- Leave script args and script add modal `h`/`l`/`←`/`→` behavior unchanged because those keys edit current values/modes and horizontal scrolling is not required there.

## Candidate Scroll Targets

Enable horizontal scroll first where the content is intrinsically wide:

- Log modal main log content (already enabled; keep as reference behavior).
- Diff modal content, especially code lines.
- Markdown modal content for code blocks, tables, and long URLs.
- AI summary overlays for logs and MR review output.
- App detail/log/detail panes where repository paths, branches, ports, or logs can overflow.
- Issue/MR detail prose panes where markdown, references, paths, or URLs can overflow.

Avoid or defer horizontal scroll where selection/action semantics are more important than wide content:

- Script args and script add modal value editing.
- Pure picker/list views unless a concrete horizontal overflow problem is identified.
- Job stage navigation controls; stages should use `Tab` only.

## Keybind Conflict Plan

| Context | Existing Conflict | Resolution |
|---|---|---|
| `diffModal` | `h`/`l` and arrows navigate previous/next file | Use `[`/`]` and `Shift+K`/`Shift+J` for previous/next file; use `h`/`l` and `←`/`→` for horizontal scroll when enabled |
| `mergeRequests` | `h`/`l` previous/next page | Use `[`/`]` and `Shift+K`/`Shift+J` for pages |
| `issues` | `h`/`l` previous/next page | Use `[`/`]` and `Shift+K`/`Shift+J` for pages |
| `jobs` | `h`/`l` and arrows switch stages | Use `Tab` only for stage switching |
| `issueDetail` | `l` opens label picker | Use `Shift+L` for label picker |
| `branchSelector` | `l` opens lazygit branch log | Use `Shift+L` for branch log |
| `scriptArgsModal` | `h`/`l` and arrows edit values | Leave unchanged; do not add horizontal scroll there |
| `scriptAddModal` | `h`/`l` and arrows toggle mode | Leave unchanged; do not add horizontal scroll there |

## Risks / Trade-offs

- Changing familiar keybinds can surprise users. Mitigate by updating the keybind registry, footer hints, guides, and help search text in the same change.
- A reusable scroll wrapper could hide important OpenTUI details. Keep props close to native scrollbox concepts and allow escape hatches for existing advanced usage such as sticky scroll.
- Horizontal scrolling can be useless if child widths are constrained to `100%`. Implementation must ensure wide content rows can size to their measured content where horizontal scroll is enabled.
- Centralized keyboard scroll helpers may need explicit active scroll targets. Start with current context-owned refs where they exist, and only add a registry if multiple active panes need arbitration.
