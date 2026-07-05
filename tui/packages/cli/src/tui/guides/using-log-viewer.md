# Using the Log Viewer

DevEnv provides a built-in log viewer for container logs and operation logs.

## 1. Opening logs

- Press `l` to view container logs for the selected item
- Press `o` to view operation logs for the selected item
- Press `L` to toggle the status log maximized view

## 2. Log navigation

| Key | Action |
|---|---|
| `j`/`k` | Scroll up/down |
| `h`/`l` or `←`/`→` | Scroll left/right |
| `u`/`d` | Half page up/down |
| `g`/`G` | Go to top/bottom |

Navigation motions scroll the viewport directly — there is no cursor line.
Select text with the mouse (OS-native selection) to copy.

## 3. Search

Press `/` to enter search mode:

| Key | Action |
|---|---|
| Type | Enter search query |
| `Enter` | Confirm search and jump to first match |
| `n`/`p` | Next/previous match |
| `Backspace` | Delete last character |
| `Esc` | Cancel search |

Matches are highlighted in yellow; the current match is highlighted in peach.

## 4. AI analysis

Press `Shift+A` to analyze log content with AI. Type a prompt and press `Enter` to submit.
Results appear in an overlay. Use `Ctrl+j`/`Ctrl+k` to scroll. Type follow-up questions
and press `Enter` to refine.

## 5. Other actions

| Key | Action |
|---|---|
| `e` | Open logs in `$EDITOR` |
| `Shift+E` | Choose an editor for logs |
| `Esc` | Close log viewer |
| `q` | Quit DevEnv |

## 6. Keyboard shortcuts summary

All log viewer keybinds:

- Navigation: `j`/`k`, `h`/`l` or `←`/`→`, `u`/`d`, `g`/`G`
- Search: `/`, `n`/`p`, `Enter`, `Esc`
- AI: `Shift+A`
- File: `e`, `Shift+E`
- Close: `Esc`, `q`
