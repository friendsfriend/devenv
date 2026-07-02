# Using Git Integrations

DevEnv integrates with GitLab and GitHub for merge request management, code review, and CI/CD workflows.

## 1. Provider setup

Before using git integrations, add at least one provider:

1. Press `c` in the table view to open Providers
2. Press `a` to add a new provider
3. Select the provider type (GitHub or GitLab)
4. Enter a name, username, and personal access token (PAT)

Provider credentials are stored in `~/.config/devenv/providers/NAME.json` with `0600` permissions.

## 2. Merge request browsing

| Key | Action |
|---|---|
| `m` | View MR for the current branch (opens detail directly) |
| `M` | View all open MRs (full list) |
| `j`/`k` | Navigate MR list |
| `g`/`G` | Go to first/last MR |
| `Enter` | Open selected MR detail |
| `[`/`]` or `Shift+K`/`Shift+J` | Previous/next page |

## 3. Merge request detail

From the MR detail view:

| Key | Action |
|---|---|
| `a` | Toggle approval |
| `Shift+A` | AI review — streams review via pi, then posts as comment |
| `r` | Rebase merge request |
| `C` | View changed files |
| `D` | View discussions/comments |
| `J` | View pipeline jobs |
| `T` | View detailed test results |
| `Esc` | Return to MR list |

## 4. Diff viewer

From the changed files view, press `Enter` on a file to open the diff modal:

| Key | Action |
|---|---|
| `j`/`k` | Navigate diff lines |
| `h`/`l` or `←`/`→` | Scroll diff left/right |
| `[`/`]` or `Shift+K`/`Shift+J` | Previous/next file |
| `v` | Toggle visual selection |
| `c` | Create comment on selected lines |
| `r` | Reply to a comment |
| `Shift+R` | Resolve/unresolve discussion |
| `s` | Toggle split/staggered view |
| `e` | Open file in editor at changed line |

## 5. Discussions

Press `D` from MR detail to view discussions:

| Key | Action |
|---|---|
| `j`/`k` | Navigate discussions |
| `r` | Reply to selected discussion |
| `x` | Toggle resolve/unresolve |
| `c` | Toggle comments-only filter |
| `Shift+D` | Open diff for commented file |
| `Shift+C` | Switch to changed files view |

## 6. Approvals

Press `a` on an MR detail to toggle approval/unapproval. The approval state is reflected in the MR detail view.

## 7. Pipeline jobs

Press `J` from MR detail to view pipeline jobs:

| Key | Action |
|---|---|
| `Tab` | Cycle stages |
| `j`/`k` | Navigate jobs |
| `v` | View job logs |
| `r`/`c` | Retry/cancel job |

## 8. Test results

Press `T` from MR detail to view test results:

| Key | Action |
|---|---|
| `j`/`k` | Navigate tests |
| `g`/`G` | Top/bottom |
| `Enter` | View test detail (output, stack trace) |
| `c` | Copy test output to clipboard |
