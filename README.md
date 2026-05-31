# rupeshnepal.com.np

Personal terminal-style portfolio built with [Hugo](https://gohugo.io/).

## Stack

- **Hugo** — Go-based static site generator
- **Vanilla JS** — terminal engine (filesystem, commands, themes, autocomplete)
- **Vanilla CSS** — layout, CRT effects, animations
- **GitHub Actions** — build & deploy to GitHub Pages

## Local dev

```bash
hugo server --port 1313
```

## Build

```bash
hugo --minify
```

Output goes to `public/` (gitignored).

## Commands available in the terminal

| Command | Description |
|---|---|
| `ls` | List directory contents |
| `cd <dir>` | Change directory |
| `cat <file>` | Read file |
| `skills` | List skills |
| `projects` | List projects with GitHub links |
| `experience` | Work history |
| `contact` | Contact info |
| `theme <name>` | Switch theme (matrix / amber / nord / dracula) |
| `open <url>` | Open URL in new tab |
| `clear` | Clear terminal |
