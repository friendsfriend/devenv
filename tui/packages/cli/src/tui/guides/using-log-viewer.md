# Using the Log Viewer

DevEnv provides a built-in log viewer for container logs and operation logs.

## 1. Opening logs

- Press `l` to view container logs for the selected app
- Press `o` to view operation logs for the selected app
- Press `L` to toggle the status log maximized view

## 2. Log navigation

| Key | Action |
|---|---|
| `j`/`k` | Scroll up/down |
| `h`/`l` | Scroll left/right |
| `u`/`d` | Half page up/down |
| `g`/`G` | Go to top/bottom |

## 3. Search

Press `/` to enter search mode:

| Key | Action |
|---|---|
| Type | Enter search query |
| `Enter` | Confirm search and jump to first match |
| `n`/`p` | Next/previous match |
| `Backspace` | Delete last character |
| `Esc` | Cancel search |

## 4. Visual selection mode

Press `v` to toggle visual selection mode. While active:

| Key | Action |
|---|---|
| `j`/`k` | Extend selection up/down |
| `c` | Copy selected range to clipboard |
| `v`/`Esc` | Exit visual mode |

## 5. AI analysis

Press `Shift+A` to analyze log content with AI:

- **Normal mode:** Enters prompt mode — type what you want to analyze and press `Enter`
- **Visual mode:** Analyzes the highlighted log range directly

Results appear in an overlay. Use `Ctrl+j`/`Ctrl+k` to scroll. Type follow-up questions and press `Enter` to refine.

## 6. Other actions

| Key | Action |
|---|---|
| `e` | Open log file in `$EDITOR` |
| `c` | Copy current line (normal mode) or selection (visual mode) |
| `Esc` | Close log viewer |
| `q` | Quit application |

## 7. Keyboard shortcuts summary

All log viewer keybinds:

- Navigation: `j`/`k`, `h`/`l`, `u`/`d`, `g`/`G`
- Search: `/`, `n`/`p`, `Enter`, `Esc`
- Visual mode: `v`, `c`
- AI: `Shift+A`
- File: `e`
- Close: `Esc`, `q`
