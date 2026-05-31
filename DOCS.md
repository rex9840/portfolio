# Portfolio Terminal — Developer Reference

## Overview

Static Hugo site. Vanilla JS + CSS. Terminal-style UI with a fake filesystem, commands, themes, sidebar explorer, and a standard card view.

**Build:** Hugo binary only (~18ms). Deployed to GitHub Pages via `peaceiris/actions-hugo@v3`.  
**Live:** `rupeshnepal.com.np` (Cloudflare proxy → GitHub Pages)

---

## File Structure

```
portfolio/
├── data/
│   └── portfolio.json        ← ALL content (profile, experience, projects, now, customFiles)
├── layouts/
│   ├── index.html            ← Main HTML shell; Hugo injects PORTFOLIO_DATA
│   ├── 404.html              ← Terminal-themed 404 with ASCII art (Hugo template)
│   └── index.resume.md       ← Hugo template that generates /resume.md at build time
├── static/
│   ├── css/style.css         ← All styles (vars, layout, components, standard view)
│   ├── js/terminal.js        ← All JS (~2200 lines, vanilla)
│   ├── rex9840.png           ← Profile image (favicon fallback)
│   ├── rex9840.webp          ← Profile image WebP (favicon preferred)
│   ├── og-image.webp         ← OG/Twitter card image 1200×630 (WebP, 57KB)
│   ├── og-image.png          ← OG image PNG fallback
│   └── robots.txt            ← Overrides Hugo auto-gen; includes sitemap URL
├── hugo.toml                 ← Hugo config
└── .github/workflows/
    └── deploy.yml            ← CI: build + deploy to gh-pages branch
```

---

## Data Layer — `data/portfolio.json`

Single source of truth. Hugo injects it at build time:

```html
<script>window.PORTFOLIO_DATA = JSON.parse({{ .Site.Data.portfolio | jsonify }});</script>
```

### Full schema

```json
{
  "profile": {
    "name": "...",
    "location": "...",
    "bio": "...",                    ← shown in whoami, neofetch, standard view
    "seoDescription": "...",         ← ≤155 chars; used in <meta description>, OG, JSON-LD
    "email": "...",
    "github": "...",
    "linkedin": "...",
    "skills": ["Go", "Python", ...]
  },
  "experience": [
    {
      "role": "...", "company": "...", "period": "...",
      "highlight": "...",            ← one-line outcome metric, shown as ★ in experience command
      "details": ["...", ...]
    }
  ],
  "projects": [
    { "name": "...", "tech": "...", "description": "...", "github": "..." }
  ],
  "now": {
    "building": "...",               ← current work focus
    "learning": "...",
    "contributing": "...",
    "reading": "...",
    "updated": "Month YYYY"
  },
  "customFiles": {
    "filename.txt": "content..."     ← appear as files under ~/user/ in the filesystem
  }
}
```

**To update content:** edit `data/portfolio.json` only.

---

## Architecture — terminal.js

Sections (search `══`):

| Section | What it does |
|---|---|
| `FILE SYSTEM` | Builds virtual FS from portfolio data |
| `COMMANDS` | `processCommand()` switch — all terminal commands |
| `THEMES` | Theme objects + `applyTheme()` |
| `FILE TREE` | Sidebar: `buildTreeNode()`, `renderFileTree()` |
| `TERMINAL STATE` | Module-level state vars |
| `CLOCK + PATH` | Analog clock canvas + `updateTopbarPath()` breadcrumbs |
| `TYPEWRITER` | Typewriter animation for text responses |
| `RENDER` | `renderInput()`, `renderHistory()` |
| `EXECUTE` | `executeCmd()` — runs a command, updates state |
| `AUTOCOMPLETE` | `updateSuggestion()`, dropdown, `getContextCompletions()` |
| `SIDEBAR` | `openSidebar()`, `closeSidebar()`, `toggleSidebar()` |
| `VIEW SWITCHER` | `switchView()` — toggles terminal ↔ standard view |
| `NEOVIM ENGINE` | Full nvim-like editor overlay |
| `INIT` | Event wiring, `boot()`, welcome modal |

### Key state variables

```js
let termInput        // current input string
let termHistory      // array of {id, command, response, path}
let currentPath      // string[], e.g. ['home','user','projects']
let suggestion       // ghost-text completion suffix
let cmdHistory       // persisted to localStorage (last 100)
let historyIdx       // position in history navigation
let dropdownItems    // completions shown in dropdown
let dropdownIdx      // active dropdown selection index
let _argHint         // hint shown when no arg typed yet
let activeFile       // full path of last cat-ed file, e.g. ['home','user','bio.txt']
const collapsedDirs  // Set of path keys; persisted to localStorage
```

---

## Terminal Commands

| Command | Description |
|---|---|
| `whoami` | Profile card with GitHub, LinkedIn, ⬇ Resume links |
| `neofetch` | System-style info panel |
| `banner` | ASCII art header |
| `skills` | Skill badges grid |
| `projects` | Project list with GitHub links |
| `experience` | Work history with ★ highlight per role |
| `contact` | Clickable contact info with copy button |
| `now` | What I'm currently building/learning/reading |
| `blog` | ASCII art under-construction page with queued topics |
| `resume` | Blob URL download of generated resume.md |
| `ls [path]` | List directory (clickable items) |
| `cd [path]` | Change directory |
| `cat <file>` | Read file; emails/URLs auto-linkified |
| `pwd` | Print working directory |
| `nvim/vim/vi <file>` | Open neovim-like editor overlay |
| `grep <pat> <file>` | Search with regex highlight |
| `touch <file>` | Create empty file (session only) |
| `rm <file>` | Delete file (session only) |
| `echo <text>` | Print text |
| `history` | Show last 30 commands |
| `open <target>` | Open URL (`github` · `linkedin` · `blog` · any URL) |
| `theme [name]` | Switch theme (matrix · amber · nord · dracula) |
| `clear` | Clear terminal |
| `help` | Show command reference |

**`cat` linkification:** file content is scanned for email addresses and URLs; matches are rendered as clickable `<a>` links.

**Tab autocomplete:** context-aware per command:
- `cd` → dirs only
- `cat`, `nvim`, `vim`, `vi`, `grep` → files only
- `theme` → theme names
- `open` → `['github', 'linkedin', 'blog']`
- others → all children of current dir

**Hint mode:** type a command + space (e.g. `theme `) to see ghost-text arg hint before typing.

**Dropdown:** Tab with 2+ completions shows `#completion-menu`. Tab cycles, Escape/Enter dismiss.

**Keyboard shortcuts:**
- `Ctrl+C` — cancel input
- `Ctrl+L` — clear terminal
- `Ctrl+U` — clear current line
- `Ctrl+W` — delete last word
- `→` / `Tab` — accept ghost suggestion

---

## Theming

Default theme: **amber**. Persisted in `localStorage('portfolio-theme')`.

| Theme | Accent | Background |
|---|---|---|
| `amber` | `#f59e0b` | `#0f0d08` |
| `matrix` | `#3fb950` | `#0d1117` |
| `nord` | `#a3be8c` | `#2e3440` |
| `dracula` | `#50fa7b` | `#282a36` |

**To add a theme:** add an entry to the `THEMES` object in `terminal.js`. Copy an existing theme as a template.

---

## Views — Terminal vs Standard

Two layouts, toggled by the `[⌨ Terminal] / [📄 Standard]` buttons in the topbar. Preference persisted to `localStorage('portfolio-view')`.

### First-visit welcome modal

On the very first visit (no `portfolio-view` in localStorage), a terminal-style modal prompts the user to choose their preferred view. Press `1`, `2`, or `Escape` (defaults to terminal). Never shown again after initial choice.

### Terminal view

The default. Full CLI experience — commands, filesystem, nvim, autocomplete.

### Standard view (`#standard-view`)

Hugo-rendered at build time (SEO-friendly, no JS flash). Sections:
- **Hero** — avatar, name, role, bio, contact links
- **Skills** — badge grid
- **Experience** — cards with `highlight` field surfaced as `★ ...`
- **Projects** — responsive grid with tech stack + GitHub links
- **Footer CTA** — mailto link

Toggle button also present inside the standard view layout.

### `switchView(target)`

```js
switchView('standard')  // hides #app, shows #standard-view, sets body.sv-active
switchView('terminal')  // restores #app, hides #standard-view, focuses input
```

Announces the switch to screen readers via `#sr-announcer`.

---

## Topbar

Layout (left → right): `☰ menu` · `path breadcrumbs` · `[⌨/📄] switcher` · `clock`

**Breadcrumbs:** `updateTopbarPath()` builds clickable `<span class="breadcrumb-seg">` elements. Clicking any segment runs `cd <path>`.

**Clock:** `position: fixed` top-level element — visible in both terminal and standard view. Canvas analog clock + digital HH:MM:SS.

---

## Sidebar / Nav Panel

**Behaviour:**
- Click dir → `cd` to it, sidebar stays open
- Click file → `cat` it, sidebar closes
- Click `▶`/`▼` chevron → collapse/expand (state in `localStorage('portfolio-collapsed')`)
- Auto-expands ancestors when CWD changes via terminal

**Active highlights** (green left-border):
- Current dir (`currentPath`) → active dir
- Last `cat`-ed file (`activeFile`) → active file

**Status bar:** bottom strip showing `cwd` + item count.

**Resize:** drag right edge. Min 180px, max 560px.

---

## 404 Page — `layouts/404.html`

Full Hugo template (not a static file). Features:
- Red block-character ASCII art `404`
- Fake bash prompts showing the attempted path
- `← cd ~`, `ls projects/`, `contact` action buttons
- Shows profile name from `portfolio.json`

---

## Neovim Editor

Triggered by `nvim <file>`, `vim <file>`, or `vi <file>`.

**Modes:** Normal · Insert · Command

| Key | Action |
|---|---|
| `i` / `I` / `a` / `A` / `o` / `O` | Enter insert mode |
| `Esc` | Normal mode |
| `h/j/k/l` · arrows | Move cursor |
| `0` / `$` | Line start / end |
| `gg` / `G` | File top / bottom |
| `dd` | Delete line |
| `x` | Delete char |
| `/` · `?` | Search forward · backward |
| `n` / `N` | Next / prev match |
| `:w` · `:wq` · `:q` · `:q!` | Save / save+quit / quit / force quit |
| `ZZ` | Save and quit |

Edits persist to the virtual filesystem node for the session — `cat` reflects changes.

---

## SEO & Meta

| Tag | Value source |
|---|---|
| `<meta description>` | `profile.seoDescription` (fallback: `profile.bio`) |
| `og:description`, `twitter:description` | same |
| `og:image`, `twitter:image` | `og-image.webp` (1200×630) |
| `og:image:width/height` | 1200 / 630 |
| `twitter:card` | `summary_large_image` |
| JSON-LD Person `image` | `og-image.webp` |
| JSON-LD Person `description` | `profile.seoDescription` |
| Canonical | `{{ .Site.BaseURL }}` |
| robots | `index, follow, noai, noimageai` |

**Hugo config:** `disableHugoGeneratorInject = true` — no `<meta name="generator">` tag.

**robots.txt** (`static/robots.txt`): overrides Hugo auto-gen, includes `Sitemap:` URL.

**HSTS:** handled by Cloudflare. Enable via Dashboard → SSL/TLS → Edge Certificates → HTTP Strict Transport Security.

---

## Accessibility

- `#history` has `role="log" aria-live="polite" aria-atomic="false"` — screen readers announce new output
- `#cmd-input` has `aria-label="Enter a terminal command"` + `.sr-only` `<label>`
- `#sr-announcer` announces view switches (`role="status" aria-live="polite"`)
- `.skip-link` — visible on Tab focus, jumps to `#terminal-scroll`
- `.sr-only` utility class available globally

---

## Adding a New Command

1. Add name to `COMMANDS` array
2. Add `case 'name':` in `processCommand()` — return `{ type: 'text', content }`, `{ type: 'node', node }`, or `{ type: 'error', content }`
3. Add to `ARG_HINTS` if it takes arguments
4. Update `getContextCompletions()` for custom arg completion
5. Add to `help` command output
6. Add a `<button class="qcmd" data-cmd="name">` in `#quick-cmds` if it deserves quick access

---

## Dev Setup

```bash
# Serve locally with live reload
hugo server

# Build for production
hugo --minify
```

No npm. No Node.js. Hugo binary only.

**Requirement:** Hugo v0.147+ (`jsonify` pipe used in templates).

---

## Deployment

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`):
1. `peaceiris/actions-hugo@v3` sets up Hugo
2. `hugo --minify` → `public/`
3. `peaceiris/actions-gh-pages@v3` pushes `public/` to `gh-pages`

Custom domain `rupeshnepal.com.np` via `static/CNAME`. Cloudflare proxies GitHub Pages.
