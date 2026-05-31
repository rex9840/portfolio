# Portfolio Terminal — Developer Reference

## Overview

Static Hugo site. No Node.js at runtime. Vanilla JS + CSS. Terminal-style UI with a fake filesystem, commands, themes, and a sidebar file explorer.

**Build:** Hugo binary only (~12ms). Deployed to GitHub Pages via `peaceiris/actions-hugo@v3`.  
**Live:** `rupeshnepal.com.np`

---

## File Structure

```
portfolio/
├── data/
│   └── portfolio.json        ← ALL content lives here (edit this to update info)
├── layouts/
│   └── index.html            ← Single HTML shell; Hugo injects PORTFOLIO_DATA
├── static/
│   ├── css/style.css         ← All styles (vars, layout, components)
│   └── js/terminal.js        ← All JS (~1900 lines, vanilla)
├── public/
│   └── resume.md             ← Static resume file (download target)
├── hugo.toml                 ← Hugo config (baseURL, disableKinds)
└── .github/workflows/
    └── deploy.yml            ← CI: build + deploy to gh-pages branch
```

---

## Data Layer

**`data/portfolio.json`** — single source of truth. Hugo injects it as `window.PORTFOLIO_DATA` at build time via:

```html
<script>window.PORTFOLIO_DATA = JSON.parse({{ .Site.Data.portfolio | jsonify }});</script>
```

Schema:
```json
{
  "profile": {
    "name": "...", "location": "...", "bio": "...",
    "email": "...", "github": "...", "linkedin": "...",
    "skills": ["Go", "Python", ...]
  },
  "experience": [
    { "role": "...", "company": "...", "period": "...", "details": ["...", ...] }
  ],
  "projects": [
    { "name": "...", "tech": "...", "description": "...", "github": "..." }
  ],
  "customFiles": {
    "notes.txt": "arbitrary content..."
  }
}
```

**To update content:** edit `data/portfolio.json` only. Nothing else needs to change.

---

## Architecture — terminal.js

The file is organised into sections (search `══`):

| Section | What it does |
|---|---|
| `FILE SYSTEM` | Builds virtual FS from portfolio data |
| `COMMANDS` | `processCommand()` switch — all terminal commands |
| `THEMES` | Theme objects + `applyTheme()` |
| `FILE TREE` | Sidebar explorer: `buildTreeNode()`, `renderFileTree()` |
| `TERMINAL STATE` | Module-level state vars |
| `CLOCK + PATH` | Analog clock canvas + `updateTopbarPath()` breadcrumbs |
| `TYPEWRITER` | Typewriter animation for text responses |
| `RENDER` | `renderInput()`, `renderHistory()` |
| `EXECUTE` | `executeCmd()` — runs a command, updates state |
| `AUTOCOMPLETE` | `updateSuggestion()`, dropdown, `getContextCompletions()` |
| `SIDEBAR` | `openSidebar()`, `closeSidebar()`, `toggleSidebar()` |
| `NEOVIM ENGINE` | Full nvim-like editor overlay |
| `INIT` | Event wiring, `boot()` sequence |

### Key state variables

```js
let termInput        // current input string
let termHistory      // array of {id, command, response, path}
let currentPath      // string[], e.g. ['home','user','projects']
let suggestion       // ghost-text completion suffix
let cmdHistory       // persisted to localStorage (last 100)
let dropdownItems    // completions shown in dropdown
let dropdownIdx      // active dropdown selection index
let _argHint         // hint shown when no arg typed yet
let activeFile       // full path array of last cat-ed file, e.g. ['home','user','bio.txt']
const collapsedDirs  // Set of path keys; persisted to localStorage
```

---

## Virtual Filesystem

Built in `buildFileSystem()` from `PORTFOLIO_DATA`. Structure:

```
/ (root)
└── home/
    └── user/
        ├── bio.txt
        ├── skills.txt
        ├── contact.txt
        ├── projects/
        │   ├── project_name.txt   ← auto-generated from projects[]
        │   └── ...
        └── experience/
            ├── company_name.txt   ← auto-generated from experience[]
            └── ...
```

`customFiles` entries appear directly under `user/`.

File names are sanitized: `sanitize(name)` → lowercase, non-alphanumeric → `_`, `.txt` suffix.

### Path resolution

`resolvePath(currentPath, target)` handles:
- `~` → `/home/user`
- `~/<path>` → relative to home
- `/absolute/path`
- `relative/path` (relative to currentPath)
- `..` and `.` segments

---

## Terminal Commands

| Command | Description |
|---|---|
| `help` | Show command reference |
| `whoami` | Profile card |
| `neofetch` | System-style info panel |
| `banner` | ASCII art header |
| `skills` | Skill badges grid |
| `projects` | Project list with GitHub links |
| `experience` | Work history |
| `contact` | Clickable contact info |
| `resume` | Download resume.md |
| `ls [path]` | List directory contents (clickable) |
| `cd [path]` | Change directory |
| `cat <file>` | Read file |
| `pwd` | Print working directory |
| `nvim/vim/vi <file>` | Open neovim-like editor |
| `grep <pat> <file>` | Search with highlight |
| `touch <file>` | Create empty file (session only) |
| `rm <file>` | Delete file (session only) |
| `echo <text>` | Print text |
| `history` | Show last 30 commands |
| `open <url\|github\|linkedin>` | Open URL in new tab |
| `theme [name]` | Switch theme (matrix/amber/nord/dracula) |
| `clear` | Clear terminal |

**Tab autocomplete:** context-aware — `cd` completes dirs only, `cat`/`nvim` files only, `theme` theme names, `open` shows `github|linkedin`. Multiple matches open a dropdown; Tab cycles through items.

**History navigation:** ↑/↓ arrows cycle through persistent command history.

**Keyboard shortcuts:**
- `Ctrl+C` — cancel input
- `Ctrl+L` — clear terminal
- `Ctrl+U` — clear current line
- `Ctrl+W` — delete last word
- `→` / `Tab` — accept autocomplete suggestion

---

## Theming

Four built-in themes. All colours are CSS custom properties on `:root`.

| Theme | Accent | Background |
|---|---|---|
| `matrix` | `#3fb950` green | `#0d1117` |
| `amber` | `#f59e0b` amber | `#0f0d08` |
| `nord` | `#a3be8c` sage | `#2e3440` |
| `dracula` | `#50fa7b` green | `#282a36` |

**To add a theme:** add an entry to the `THEMES` object in `terminal.js`. Key is the theme name; value is a map of CSS variable names to colour values. Copy an existing theme as a template.

Active theme persisted in `localStorage('portfolio-theme')`.

---

## Sidebar / Nav Panel

VS Code-style explorer with terminal aesthetics.

**Behaviour:**
- Click directory → `cd` to it; sidebar stays open (user is navigating)
- Click file → `cat` it; sidebar closes
- Click `▶`/`▼` chevron → collapse/expand directory (state persisted)
- Navigating via terminal commands auto-expands ancestors in the tree
- Status bar at bottom shows current path + item count

**Active highlights** (green left-border + green text):
- Current working directory (`currentPath`) → active dir highlight
- Last `cat`-ed file (`activeFile`) → active file highlight
- Both update instantly on every command; independent of each other

**Resize:** drag the right edge to resize the sidebar panel. Min 180px, max 560px.

**Collapse state:** persisted in `localStorage('portfolio-collapsed')` as JSON array of path keys like `['home/user/projects']`.

---

## Neovim Editor

Triggered by `nvim <file>`, `vim <file>`, or `vi <file>`. Full overlay.

**Modes:** Normal, Insert, Command  
**Key bindings:**

| Key | Action |
|---|---|
| `i` / `I` / `a` / `A` / `o` / `O` | Enter insert mode |
| `Esc` | Return to normal mode |
| `h/j/k/l` or arrow keys | Move cursor |
| `0` / `$` | Start / end of line |
| `gg` / `G` | Top / bottom of file |
| `dd` | Delete line |
| `x` | Delete character |
| `/` | Search forward |
| `?` | Search backward |
| `n` / `N` | Next / previous match |
| `:w` | Save |
| `:wq` | Save and quit |
| `:q` | Quit (error if unsaved) |
| `:q!` | Force quit |
| `ZZ` | Save and quit |

Edits are written to the virtual filesystem node — `cat` will reflect changes in the same session.

---

## Autocomplete System

`updateSuggestion(val)` runs on every keystroke.

**Command completion (no arg):** searches `cmdHistory` reversed (history-first), falls back to `COMMANDS` array.

**Arg completion:** `getContextCompletions(cmd, path, partial)` returns:
- `cd` → dirs only
- `cat`, `nvim`, `vim`, `vi`, `grep` → files only
- `theme` → theme names
- `open` → `['github', 'linkedin']`
- others → all children

**Hint mode** (trailing space, no partial): shows `ARG_HINTS[cmd]` as ghost text, e.g. `theme ` → `matrix|amber|nord|dracula`.

**Dropdown:** when 2+ completions exist, shown in `#completion-menu`. Tab cycles, Enter/Escape dismiss, click accepts.

---

## Topbar Breadcrumbs

`updateTopbarPath()` builds clickable `<span class="breadcrumb-seg">` elements for each path segment. Clicking navigates to that path via `executeCmd('cd <path>')`.

---

## Adding a New Command

1. Add the command name to `COMMANDS` array (for Tab completion and `didYouMean`)
2. Add a `case 'command':` block inside `processCommand()` returning `{ type: 'text', content: '...' }` or `{ type: 'node', node: domElement }` or `{ type: 'error', content: '...' }`
3. Optionally add to `ARG_HINTS` if it takes arguments
4. Update `getContextCompletions()` if it needs custom arg completion
5. Add to the `help` command output

---

## Dev Setup

```bash
# Install Hugo (extended) — one-time
# https://gohugo.io/installation/

# Serve locally with live reload
hugo server

# Build for production
hugo --minify
```

No npm, no Node.js, no build tools. Just Hugo.

**Environment:** Hugo v0.147+ required (uses `jsonify` pipe).

---

## Deployment

Push to `main` → GitHub Actions runs `.github/workflows/deploy.yml`:
1. Checkout with submodules
2. `peaceiris/actions-hugo@v3` sets up Hugo
3. `hugo --minify` builds to `public/`
4. `peaceiris/actions-gh-pages@v3` pushes `public/` to `gh-pages` branch

Custom domain: `rupeshnepal.com.np` via `CNAME` file in `static/`.
