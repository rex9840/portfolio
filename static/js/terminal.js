/* ── Portfolio data injected by Hugo ── */
const config = window.PORTFOLIO_DATA;

/* ══════════════════════════════════════
   FILE SYSTEM
══════════════════════════════════════ */
function sanitize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.txt';
}

function buildFileSystem() {
  const projectFiles = {};
  config.projects.forEach(p => {
    projectFiles[sanitize(p.name)] = {
      type: 'file',
      content: `Title: ${p.name}\nTech Stack: ${p.tech}\n------------------------\n${p.description}`
    };
  });

  const experienceFiles = {};
  config.experience.forEach(e => {
    experienceFiles[sanitize(e.company)] = {
      type: 'file',
      content: `Role: ${e.role}\nCompany: ${e.company}\nPeriod: ${e.period}\n------------------------\nSummary:\n${e.details.map(d => `- ${d}`).join('\n')}`
    };
  });

  const customFiles = {};
  if (config.customFiles) {
    Object.entries(config.customFiles).forEach(([name, content]) => {
      customFiles[name] = { type: 'file', content };
    });
  }

  return {
    type: 'dir',
    children: {
      home: {
        type: 'dir',
        children: {
          user: {
            type: 'dir',
            children: {
              'bio.txt': {
                type: 'file',
                content: `Name: ${config.profile.name}\nLocation: ${config.profile.location}\n\n${config.profile.bio}`
              },
              'skills.txt': { type: 'file', content: config.profile.skills.join('\n') },
              'contact.txt': {
                type: 'file',
                content: `Email: ${config.profile.email}\nGitHub: ${config.profile.github}\nLinkedIn: ${config.profile.linkedin}`
              },
              projects:   { type: 'dir', children: projectFiles },
              experience: { type: 'dir', children: experienceFiles },
              ...customFiles
            }
          }
        }
      }
    }
  };
}

const fileSystem = buildFileSystem();

function resolvePath(currentPath, targetPath) {
  if (targetPath === '/') return { node: fileSystem, newPath: [] };

  let pathStack, remaining;
  if (targetPath.startsWith('~')) {
    pathStack = ['home', 'user'];
    remaining = targetPath.slice(1).startsWith('/') ? targetPath.slice(2) : targetPath.slice(1);
  } else if (targetPath.startsWith('/')) {
    pathStack = [];
    remaining = targetPath.slice(1);
  } else {
    pathStack = [...currentPath];
    remaining = targetPath;
  }

  for (const part of remaining.split('/').filter(Boolean)) {
    if (part === '.') continue;
    if (part === '..') { if (pathStack.length) pathStack.pop(); continue; }
    pathStack.push(part);
  }

  let node = fileSystem;
  for (const part of pathStack) {
    if (node.type !== 'dir' || !node.children[part]) return { node: null, newPath: currentPath };
    node = node.children[part];
  }
  return { node, newPath: pathStack };
}

function getNodeAtPath(parts) {
  let cur = fileSystem;
  for (const p of parts) {
    if (cur.type !== 'dir' || !cur.children[p]) return null;
    cur = cur.children[p];
  }
  return cur;
}

function getCompletions(currentPath, partial) {
  const node = getNodeAtPath(currentPath);
  if (!node || node.type !== 'dir') return [];
  return Object.keys(node.children).filter(n => n.toLowerCase().startsWith(partial.toLowerCase()));
}

function getContextCompletions(cmd, path, partial) {
  const c = cmd.toLowerCase();
  if (c === 'theme') return THEME_NAMES.filter(n => n.startsWith(partial.toLowerCase()));
  if (c === 'open')  return ['github', 'linkedin'].filter(n => n.startsWith(partial.toLowerCase()));
  const node = getNodeAtPath(path);
  if (!node || node.type !== 'dir') return [];
  const entries = Object.entries(node.children);
  const low = partial.toLowerCase();
  if (c === 'cd')
    return entries.filter(([, v]) => v.type === 'dir').map(([k]) => k).filter(n => n.toLowerCase().startsWith(low));
  if (c === 'cat' || c === 'nvim' || c === 'vim' || c === 'vi' || c === 'grep')
    return entries.filter(([, v]) => v.type === 'file').map(([k]) => k).filter(n => n.toLowerCase().startsWith(low));
  return entries.map(([k]) => k).filter(n => n.toLowerCase().startsWith(low));
}

/* ══════════════════════════════════════
   COMMANDS
══════════════════════════════════════ */
const COMMANDS = [
  'help', 'ls', 'cat', 'cd', 'clear', 'home', 'pwd',
  'banner', 'whoami', 'neofetch', 'contact', 'skills', 'projects', 'experience',
  'theme', 'open', 'nvim', 'vim', 'vi',
  'grep', 'echo', 'touch', 'rm', 'history', 'resume',
];

const ARG_HINTS = {
  theme:    'matrix|amber|nord|dracula',
  open:     'github|linkedin',
  cd:       '<directory>',
  cat:      '<file>',
  nvim:     '<file>',
  vim:      '<file>',
  vi:       '<file>',
  grep:     '<pattern> <file>',
  touch:    '<filename>',
  rm:       '<file>',
  echo:     '<text>',
};

function generateResumeMD() {
  const p = config.profile;
  const lines = [];

  lines.push(`# ${p.name}`);
  lines.push(`**Backend Developer** · ${p.location}`);
  lines.push(`${p.email} · [GitHub](${p.github}) · [LinkedIn](${p.linkedin})`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(p.bio);
  lines.push('');
  lines.push('## Skills');
  lines.push('');
  lines.push(p.skills.join(' · '));
  lines.push('');
  lines.push('## Experience');
  lines.push('');
  config.experience.forEach(e => {
    lines.push(`### ${e.role} — ${e.company}`);
    lines.push(`*${e.period}*`);
    lines.push('');
    e.details.forEach(d => lines.push(`- ${d}`));
    lines.push('');
  });
  lines.push('## Projects');
  lines.push('');
  config.projects.forEach(proj => {
    lines.push(`### ${proj.name} \`[${proj.tech}]\``);
    lines.push(proj.description);
    if (proj.github) lines.push(`[GitHub](${proj.github})`);
    lines.push('');
  });

  return lines.join('\n');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m + 1}, (_, i) =>
    Array.from({length: n + 1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function didYouMean(cmd) {
  let best = null, bestDist = Infinity;
  for (const c of COMMANDS) {
    const d = levenshtein(cmd.toLowerCase(), c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return bestDist <= 2 ? best : null;
}

/* ══════════════════════════════════════
   THEMES
══════════════════════════════════════ */
const THEMES = {
  matrix: {
    '--green':      '#3fb950',
    '--green-glow': 'rgba(63,185,80,0.15)',
    '--bg':         '#0d1117',
    '--bg-sidebar': '#010409',
    '--text':       '#e6edf3',
    '--red':        '#f85149',
    '--blue-4':     '#58a6ff',
    '--blue-5':     '#388bfd',
    '--gray-3':     '#c9d1d9',
    '--gray-4':     '#8b949e',
    '--gray-5':     '#6e7681',
    '--gray-6':     '#484f58',
    '--gray-7':     '#30363d',
  },
  amber: {
    '--green':      '#f59e0b',
    '--green-glow': 'rgba(245,158,11,0.12)',
    '--bg':         '#0f0d08',
    '--bg-sidebar': '#080600',
    '--text':       '#fef3c7',
    '--red':        '#ef4444',
    '--blue-4':     '#fbbf24',
    '--blue-5':     '#f59e0b',
    '--gray-3':     '#d6d3d1',
    '--gray-4':     '#a8a29e',
    '--gray-5':     '#78716c',
    '--gray-6':     '#57534e',
    '--gray-7':     '#44403c',
  },
  nord: {
    '--green':      '#a3be8c',
    '--green-glow': 'rgba(163,190,140,0.12)',
    '--bg':         '#2e3440',
    '--bg-sidebar': '#242933',
    '--text':       '#eceff4',
    '--red':        '#bf616a',
    '--blue-4':     '#88c0d0',
    '--blue-5':     '#5e81ac',
    '--gray-3':     '#d8dee9',
    '--gray-4':     '#adb5bd',
    '--gray-5':     '#7c8490',
    '--gray-6':     '#5c6370',
    '--gray-7':     '#434c5e',
  },
  dracula: {
    '--green':      '#50fa7b',
    '--green-glow': 'rgba(80,250,123,0.10)',
    '--bg':         '#282a36',
    '--bg-sidebar': '#1e1f29',
    '--text':       '#f8f8f2',
    '--red':        '#ff5555',
    '--blue-4':     '#8be9fd',
    '--blue-5':     '#6272a4',
    '--gray-3':     '#f8f8f2',
    '--gray-4':     '#bd93f9',
    '--gray-5':     '#6272a4',
    '--gray-6':     '#44475a',
    '--gray-7':     '#383a4a',
  },
};

const THEME_NAMES = Object.keys(THEMES);
let activeTheme = localStorage.getItem('portfolio-theme') || 'matrix';

function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return false;
  const root = document.documentElement;
  Object.entries(theme).forEach(([k, v]) => root.style.setProperty(k, v));
  activeTheme = name;
  localStorage.setItem('portfolio-theme', name);
  return true;
}

const BANNER_ASCII = `╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  ██████╗ ██╗   ██╗██████╗ ███████╗███████╗██╗  ██╗          ║
║  ██╔══██╗██║   ██║██╔══██╗██╔════╝██╔════╝██║  ██║          ║
║  ██████╔╝██║   ██║██████╔╝█████╗  ███████╗███████║          ║
║  ██╔══██╗██║   ██║██╔═══╝ ██╔══╝  ╚════██║██╔══██║          ║
║  ██║  ██║╚██████╔╝██║     ███████╗███████║██║  ██║          ║
║  ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝╚══════╝╚═╝  ╚═╝          ║
║                                                               ║
║  ███╗   ██╗███████╗██████╗  █████╗ ██╗                      ║
║  ████╗  ██║██╔════╝██╔══██╗██╔══██╗██║                      ║
║  ██╔██╗ ██║█████╗  ██████╔╝███████║██║                      ║
║  ██║╚██╗██║██╔══╝  ██╔═══╝ ██╔══██║██║                      ║
║  ██║ ╚████║███████╗██║     ██║  ██║███████╗                 ║
║  ╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝  ╚═╝╚══════╝                 ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝`;

function makeBanner() {
  const wrap = document.createElement('div');

  // ASCII art (hidden on very small screens via CSS)
  const pre = document.createElement('pre');
  pre.className = 'banner-pre';
  pre.textContent = BANNER_ASCII;

  // Mobile fallback title
  const mobileTitle = document.createElement('div');
  mobileTitle.className = 'banner-mobile';
  mobileTitle.textContent = '[ RUPESH NEPAL ]';

  const sub = document.createElement('div');
  sub.className = 'banner-sub';

  const arrow = document.createElement('span');
  arrow.className = 'banner-arrow';
  arrow.textContent = '»';

  const info = document.createElement('div');

  const welcome = document.createElement('div');
  welcome.textContent = "Welcome to Rupesh Nepal's terminal portfolio";
  welcome.style.marginBottom = '4px';

  const hint = document.createElement('div');
  hint.className = 'banner-hint';
  const strong = document.createElement('strong');
  strong.textContent = 'help';
  hint.append('Type ', strong, ' for available commands');

  info.appendChild(welcome);
  info.appendChild(hint);
  sub.appendChild(arrow);
  sub.appendChild(info);

  wrap.appendChild(pre);
  wrap.appendChild(mobileTitle);
  wrap.appendChild(sub);
  return { type: 'node', node: wrap };
}

function processCommand(cmd, currentPath) {
  const parts = cmd.trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  switch (command) {
    case 'help':
      return {
        type: 'text',
        content: `Available commands:
  resume         Generate and download resume as Markdown
  whoami         Profile card
  neofetch       System-style profile overview
  skills         Skill badges
  projects       Projects with GitHub links
  experience     Work history
  contact        Contact info (clickable + copy)
  ls / cd / cat  Navigate the filesystem
  nvim <file>    Open file  (i insert · Esc normal · / search · :wq save+quit)
  grep <pat> <f> Search pattern in file
  touch <file>   Create empty file (session)
  rm <file>      Delete file (session)
  echo <text>    Print text
  history        Show command history
  open <url>     Open URL  (open github · open linkedin)
  theme <name>   Switch theme  (matrix · amber · nord · dracula)
  clear          Clear terminal
  help           Show this message

Tips: Tab/→ autocomplete · ↑/↓ history`
      };

    case 'pwd':
      return { type: 'text', content: '/' + currentPath.join('/') };

    case 'whoami': {
      const card = document.createElement('div');
      card.className = 'whoami-card';

      const name = document.createElement('div');
      name.className = 'whoami-name';
      name.textContent = config.profile.name;

      const role = document.createElement('div');
      role.className = 'whoami-role';
      role.textContent = 'Backend Developer';

      const loc = document.createElement('div');
      loc.className = 'whoami-loc';
      loc.textContent = '📍 ' + config.profile.location;

      const bio = document.createElement('div');
      bio.className = 'whoami-bio';
      bio.textContent = config.profile.bio;

      const links = document.createElement('div');
      links.className = 'whoami-links';
      [
        { label: 'GitHub',   href: config.profile.github },
        { label: 'LinkedIn', href: config.profile.linkedin },
      ].forEach(({ label, href }) => {
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'whoami-link';
        a.textContent = '↗ ' + label;
        links.appendChild(a);
      });

      card.appendChild(name);
      card.appendChild(role);
      card.appendChild(loc);
      card.appendChild(bio);
      card.appendChild(links);
      return { type: 'node', node: card };
    }

    case 'neofetch': {
      const wrap = document.createElement('div');
      wrap.className = 'neofetch';

      const art = document.createElement('pre');
      art.className = 'neofetch-art';
      art.textContent = [
        '  ██████╗ ',
        '  ██╔══██╗',
        '  ██████╔╝',
        '  ██╔══██╗',
        '  ██║  ██║',
        '  ╚═╝  ╚═╝',
      ].join('\n');

      const info = document.createElement('div');
      info.className = 'neofetch-info';

      const p = config.profile;
      const rows = [
        ['', `[1m${p.name}[0m`],
        ['OS',       'GitHub Pages + Hugo'],
        ['Shell',    'portfolio-sh 1.0'],
        ['Role',     'Backend Developer'],
        ['Location', p.location],
        ['GitHub',   p.github.replace('https://', '')],
        ['Email',    p.email],
        ['Skills',   config.profile.skills.slice(0, 5).join(' · ') + ' …'],
        ['Theme',    activeTheme],
      ];

      rows.forEach(([key, val]) => {
        const row = document.createElement('div');
        row.className = 'neofetch-row';
        if (key) {
          const k = document.createElement('span');
          k.className = 'neofetch-key';
          k.textContent = key + ': ';
          row.appendChild(k);
        }
        const v = document.createElement('span');
        v.className = key ? 'neofetch-val' : 'neofetch-title';
        v.textContent = val;
        row.appendChild(v);
        info.appendChild(row);
      });

      // Colour palette dots
      const palette = document.createElement('div');
      palette.className = 'neofetch-palette';
      ['--green','--red','--blue-4','--gray-4','--text'].forEach(v => {
        const dot = document.createElement('span');
        dot.className = 'neofetch-dot';
        dot.style.background = `var(${v})`;
        palette.appendChild(dot);
      });
      info.appendChild(palette);

      wrap.appendChild(art);
      wrap.appendChild(info);
      return { type: 'node', node: wrap };
    }

    case 'banner':
      return makeBanner();

    case 'home':
      return { ...makeBanner(), newPath: ['home', 'user'] };

    case 'contact': {
      const wrap = document.createElement('div');
      wrap.className = 'contact-list';

      const items = [
        { label: 'Email',    value: config.profile.email,    href: 'mailto:' + config.profile.email,    copy: true },
        { label: 'GitHub',   value: config.profile.github,   href: config.profile.github,               copy: false },
        { label: 'LinkedIn', value: config.profile.linkedin, href: config.profile.linkedin,             copy: false },
      ];

      items.forEach(({ label, value, href, copy }) => {
        const row = document.createElement('div');
        row.className = 'contact-row';

        const lbl = document.createElement('span');
        lbl.className = 'contact-label';
        lbl.textContent = label;

        const a = document.createElement('a');
        a.href = href;
        a.target = href.startsWith('mailto') ? '_self' : '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'contact-link';
        a.textContent = value.replace('https://', '');

        row.appendChild(lbl);
        row.appendChild(a);

        if (copy) {
          const btn = document.createElement('button');
          btn.className = 'copy-btn';
          btn.textContent = 'copy';
          btn.addEventListener('click', () => {
            navigator.clipboard.writeText(value).then(() => {
              btn.textContent = 'copied!';
              setTimeout(() => { btn.textContent = 'copy'; }, 1500);
            });
          });
          row.appendChild(btn);
        }

        wrap.appendChild(row);
      });

      return { type: 'node', node: wrap };
    }

    case 'skills': {
      const grid = document.createElement('div');
      grid.className = 'skills-grid';
      config.profile.skills.forEach(skill => {
        const badge = document.createElement('span');
        badge.className = 'skill-badge';
        badge.textContent = skill;
        grid.appendChild(badge);
      });
      return { type: 'node', node: grid };
    }

    case 'projects': {
      const list = document.createElement('div');
      list.className = 'section-list';
      config.projects.forEach(p => {
        const entry = document.createElement('div');
        entry.className = 'project-entry';

        const header = document.createElement('div');
        const title = document.createElement('span');
        title.className = 'project-title';
        title.textContent = p.name;
        const tech = document.createElement('span');
        tech.className = 'project-tech';
        tech.textContent = ` [${p.tech}]`;
        header.appendChild(title);
        header.appendChild(tech);

        const desc = document.createElement('div');
        desc.className = 'project-desc';
        desc.textContent = p.description;

        entry.appendChild(header);
        entry.appendChild(desc);

        if (p.github) {
          const link = document.createElement('div');
          link.className = 'project-link';
          const a = document.createElement('a');
          a.href = p.github;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.textContent = '↗ ' + p.github.replace('https://', '');
          link.appendChild(a);
          entry.appendChild(link);
        }

        list.appendChild(entry);
      });
      return { type: 'node', node: list };
    }

    case 'experience': {
      const list = document.createElement('div');
      list.className = 'section-list';
      config.experience.forEach(e => {
        const entry = document.createElement('div');
        entry.className = 'exp-entry';

        const header = document.createElement('div');
        const role = document.createElement('span');
        role.className = 'exp-role';
        role.textContent = e.role;
        const company = document.createElement('span');
        company.className = 'exp-company';
        company.textContent = ` @ ${e.company}`;
        header.appendChild(role);
        header.appendChild(company);

        const period = document.createElement('div');
        period.className = 'exp-period';
        period.textContent = e.period;

        entry.appendChild(header);
        entry.appendChild(period);
        e.details.forEach(d => {
          const detail = document.createElement('div');
          detail.className = 'exp-detail';
          detail.textContent = `• ${d}`;
          entry.appendChild(detail);
        });
        list.appendChild(entry);
      });
      return { type: 'node', node: list };
    }

    case 'cd': {
      if (!args.length) return { type: 'text', content: '', newPath: ['home', 'user'] };
      const { node, newPath } = resolvePath(currentPath, args[0]);
      if (!node) return { type: 'error', content: `cd: ${args[0]}: No such file or directory` };
      if (node.type !== 'dir') return { type: 'error', content: `cd: ${args[0]}: Not a directory` };
      return { type: 'text', content: '', newPath };
    }

    case 'ls':
    case 'll': {
      const listPath = args.length ? args[0] : '.';
      const { node: lsNode, newPath: lsResolved } = resolvePath(currentPath, listPath);
      if (!lsNode) return { type: 'error', content: `ls: ${listPath}: No such file or directory` };
      if (lsNode.type !== 'dir') return { type: 'text', content: listPath };

      const grid = document.createElement('div');
      grid.className = 'ls-grid';

      Object.entries(lsNode.children).forEach(([name, item]) => {
        const absPath = ['', ...lsResolved, name].join('/').replace(/\/+/g, '/');
        const div = document.createElement('div');
        div.className = 'ls-item';
        div.dataset.cmd = item.type === 'dir' ? `cd ${absPath}` : `cat ${absPath}`;

        const icon = document.createElement('span');
        icon.textContent = item.type === 'dir' ? '📁' : '📄';

        const label = document.createElement('span');
        label.className = 'ls-name ' + item.type;
        label.textContent = name + (item.type === 'dir' ? '/' : '');

        div.appendChild(icon);
        div.appendChild(label);
        grid.appendChild(div);
      });
      return { type: 'node', node: grid };
    }

    case 'cat': {
      if (!args.length) return { type: 'error', content: 'usage: cat <file>' };
      const { node: catNode } = resolvePath(currentPath, args[0]);
      if (!catNode) return { type: 'error', content: `cat: ${args[0]}: No such file or directory` };
      if (catNode.type === 'dir') return { type: 'error', content: `cat: ${args[0]}: Is a directory` };
      return { type: 'text', content: catNode.content };
    }

    case 'theme': {
      const sub = args[0]?.toLowerCase();
      if (!sub || sub === 'list') {
        const list = document.createElement('div');
        THEME_NAMES.forEach(name => {
          const row = document.createElement('div');
          row.className = 'theme-row';
          const dot = document.createElement('span');
          dot.className = 'theme-dot';
          dot.style.background = THEMES[name]['--green'];
          const label = document.createElement('span');
          label.className = 'theme-label';
          label.textContent = name + (name === activeTheme ? '  ← active' : '');
          const btn = document.createElement('button');
          btn.className = 'theme-apply-btn';
          btn.textContent = name === activeTheme ? 'current' : 'apply';
          btn.disabled = name === activeTheme;
          btn.dataset.cmd = `theme ${name}`;
          row.appendChild(dot);
          row.appendChild(label);
          row.appendChild(btn);
          list.appendChild(row);
        });
        return { type: 'node', node: list };
      }
      if (applyTheme(sub)) {
        return { type: 'text', content: `Theme set to "${sub}". Type "theme list" to switch.` };
      }
      return { type: 'error', content: `Unknown theme "${sub}". Available: ${THEME_NAMES.join(', ')}` };
    }

    case 'nvim':
    case 'vim':
    case 'vi': {
      if (!args.length) return { type: 'error', content: `usage: ${command} <file>` };

      let { node: nvimFile } = resolvePath(currentPath, args[0]);

      if (!nvimFile) {
        // Create the file — resolve parent dir first
        const lastSlash = args[0].lastIndexOf('/');
        const filename  = lastSlash >= 0 ? args[0].slice(lastSlash + 1) : args[0];
        const dirPath   = lastSlash >= 0 ? args[0].slice(0, lastSlash) || '/' : '.';
        const { node: parentDir } = resolvePath(currentPath, dirPath);
        if (!parentDir || parentDir.type !== 'dir') {
          return { type: 'error', content: `${command}: ${args[0]}: No such file or directory` };
        }
        nvimFile = { type: 'file', content: '' };
        parentDir.children[filename] = nvimFile;
        renderFileTree();
      }

      if (nvimFile.type === 'dir') return { type: 'error', content: `${command}: ${args[0]}: is a directory` };

      const displayName = args[0].split('/').filter(Boolean).pop() ?? args[0];
      setTimeout(() => openNvim(displayName, nvimFile.content, nvimFile), 30);
      return { type: 'text', content: '' };
    }

    case 'open': {
      if (!args.length) return { type: 'error', content: 'usage: open <url|github|linkedin>' };
      let url = args[0];
      if (url === 'github')   url = config.profile.github;
      if (url === 'linkedin') url = config.profile.linkedin;
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, '_blank', 'noopener,noreferrer');
      return { type: 'text', content: `Opening ${url} ...` };
    }

    case 'resume': {
      const md = generateResumeMD();
      const wrap = document.createElement('div');
      wrap.className = 'resume-wrap';

      // Progress bar
      const progress = document.createElement('div');
      progress.className = 'resume-progress';
      const bar = document.createElement('div');
      bar.className = 'resume-bar';
      const label = document.createElement('span');
      label.className = 'resume-label';
      label.textContent = 'Ready';
      progress.appendChild(bar);
      progress.appendChild(label);

      // Download button — real <a> so browser handles download natively on click
      const filename = config.profile.name.replace(/\s+/g, '_') + '_Resume.md';
      const btn = document.createElement('a');
      btn.className = 'resume-dl-btn';
      btn.href = 'resume.md';
      btn.download = filename;
      btn.textContent = '⬇  download resume.md';

      // Progress bar is purely cosmetic — plays alongside the native download
      btn.addEventListener('click', () => {
        const steps = [
          [20,  'Collecting profile…'],
          [45,  'Writing experience…'],
          [65,  'Adding projects…'],
          [85,  'Formatting…'],
          [100, 'Done ✓'],
        ];
        let i = 0;
        function runStep() {
          if (i >= steps.length) {
            setTimeout(() => { bar.style.width = '0%'; label.textContent = 'Ready'; }, 1800);
            return;
          }
          bar.style.width = steps[i][0] + '%';
          label.textContent = steps[i][1];
          i++;
          setTimeout(runStep, 160);
        }
        runStep();
      });

      // Inline preview (first 22 lines)
      const preview = document.createElement('pre');
      preview.className = 'resume-preview';
      preview.textContent = md.split('\n').slice(0, 22).join('\n') + '\n…';

      wrap.appendChild(progress);
      wrap.appendChild(btn);
      wrap.appendChild(preview);
      return { type: 'node', node: wrap };
    }

    case 'echo':
      return { type: 'text', content: args.join(' ') };

    case 'history': {
      if (!cmdHistory.length) return { type: 'text', content: 'No command history.' };
      const wrap = document.createElement('div');
      wrap.style.fontFamily = 'monospace';
      const slice = cmdHistory.slice(-30);
      const offset = cmdHistory.length - slice.length;
      slice.forEach((cmd, i) => {
        const row = document.createElement('div');
        const num = document.createElement('span');
        num.style.cssText = 'color:var(--gray-5);display:inline-block;min-width:5ch;text-align:right;margin-right:10px';
        num.textContent = offset + i + 1;
        const txt = document.createElement('span');
        txt.style.color = 'var(--text)';
        txt.textContent = cmd;
        row.appendChild(num);
        row.appendChild(txt);
        wrap.appendChild(row);
      });
      return { type: 'node', node: wrap };
    }

    case 'grep': {
      if (args.length < 2) return { type: 'error', content: 'usage: grep <pattern> <file>' };
      const { node: grepNode } = resolvePath(currentPath, args[1]);
      if (!grepNode) return { type: 'error', content: `grep: ${args[1]}: No such file or directory` };
      if (grepNode.type === 'dir') return { type: 'error', content: `grep: ${args[1]}: Is a directory` };
      let regex;
      try { regex = new RegExp(args[0], 'gi'); } catch { return { type: 'error', content: `grep: invalid pattern` }; }
      const grepLines = grepNode.content.split('\n');
      const matches = grepLines.map((line, i) => ({ line, num: i + 1 })).filter(r => regex.test(r.line));
      if (!matches.length) return { type: 'text', content: '' };
      const wrap = document.createElement('div');
      matches.forEach(({ line, num }) => {
        const row = document.createElement('div');
        row.style.fontFamily = 'monospace';
        const lineNum = document.createElement('span');
        lineNum.style.cssText = 'color:var(--gray-5);margin-right:6px';
        lineNum.textContent = num + ':';
        row.appendChild(lineNum);
        regex.lastIndex = 0;
        const highlighted = line.replace(new RegExp(args[0], 'gi'), m => `\x01${m}\x02`);
        highlighted.split(/(\x01[^\x02]*\x02)/).forEach(part => {
          if (part.startsWith('\x01')) {
            const span = document.createElement('span');
            span.style.cssText = 'color:var(--red);font-weight:bold';
            span.textContent = part.slice(1, -1);
            row.appendChild(span);
          } else if (part) {
            row.appendChild(document.createTextNode(part));
          }
        });
        wrap.appendChild(row);
      });
      return { type: 'node', node: wrap };
    }

    case 'touch': {
      if (!args.length) return { type: 'error', content: 'usage: touch <filename>' };
      const touchDir = getNodeAtPath(currentPath);
      if (!touchDir || touchDir.type !== 'dir') return { type: 'error', content: 'touch: cannot create file here' };
      if (!touchDir.children[args[0]]) {
        touchDir.children[args[0]] = { type: 'file', content: '' };
        renderFileTree();
      }
      return { type: 'text', content: '' };
    }

    case 'rm': {
      if (!args.length) return { type: 'error', content: 'usage: rm <file>' };
      const rmDir = getNodeAtPath(currentPath);
      if (!rmDir || rmDir.type !== 'dir') return { type: 'error', content: '' };
      if (!rmDir.children[args[0]]) return { type: 'error', content: `rm: ${args[0]}: No such file or directory` };
      if (rmDir.children[args[0]].type === 'dir') return { type: 'error', content: `rm: ${args[0]}: is a directory` };
      delete rmDir.children[args[0]];
      renderFileTree();
      return { type: 'text', content: '' };
    }

    default: {
      const suggestion = didYouMean(command);
      const msg = `command not found: ${command}` + (suggestion ? `\nDid you mean: ${suggestion}?` : '');
      return { type: 'error', content: msg };
    }
  }
}

/* ══════════════════════════════════════
   FILE TREE
══════════════════════════════════════ */
function buildTreeNode(name, node, path, level, isLast, parentPrefix, activePath) {
  const isDir = node.type === 'dir';
  const fullPath = [...path, name];
  const pathKey = fullPath.join('/');
  const isActive = isDir
    ? pathKey === activePath.join('/')
    : pathKey === activeFile.join('/');
  const isCollapsed = isDir && collapsedDirs.has(pathKey);

  const currentPrefix = level === 0 ? '' : (isLast ? '└─' : '├─');
  const childPrefix = parentPrefix + (level === 0 ? '' : (isLast ? '  ' : '│ '));

  const wrap = document.createElement('div');

  const row = document.createElement('div');
  row.className = 'tree-node' + (isActive ? ' active' : '');

  const pre = document.createElement('span');
  pre.className = 'tree-prefix';
  pre.textContent = parentPrefix + currentPrefix;
  row.appendChild(pre);

  if (isDir) {
    const chevron = document.createElement('span');
    chevron.className = 'tree-chevron';
    chevron.textContent = isCollapsed ? '▶' : '▼';
    chevron.title = isCollapsed ? 'expand' : 'collapse';
    chevron.addEventListener('click', e => {
      e.stopPropagation();
      collapsedDirs.has(pathKey) ? collapsedDirs.delete(pathKey) : collapsedDirs.add(pathKey);
      persistCollapsed();
      renderFileTree();
    });
    row.appendChild(chevron);
  }

  const label = document.createElement('span');
  label.className = 'tree-node-name ' + (isDir ? 'dir' : 'file');
  label.textContent = name + (isDir ? '/' : '');
  row.appendChild(label);

  if (isDir) {
    const childCount = Object.keys(node.children).length;
    if (childCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'tree-badge';
      badge.textContent = childCount;
      row.appendChild(badge);
    }
  }

  row.addEventListener('click', e => {
    e.stopPropagation();
    if (isDir) {
      executeCmd(`cd /${fullPath.join('/')}`);
      focusInput();
      // keep sidebar open — user is navigating
    } else {
      executeCmd(`cd /${path.join('/')}`);
      executeCmd(`cat ${name}`);
      closeSidebar();
      focusInput();
    }
  });

  wrap.appendChild(row);

  if (isDir && !isCollapsed) {
    const children = Object.entries(node.children);
    children.forEach(([childName, childNode], idx) => {
      wrap.appendChild(
        buildTreeNode(childName, childNode, fullPath, level + 1, idx === children.length - 1, childPrefix, activePath)
      );
    });
  }

  return wrap;
}

function renderFileTree() {
  const container = document.getElementById('file-tree');
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'tree-header';
  const headerTitle = document.createElement('span');
  headerTitle.textContent = 'EXPLORER';
  const headerTag = document.createElement('span');
  headerTag.className = 'tree-header-tag';
  headerTag.textContent = '[portfolio]';
  header.appendChild(headerTitle);
  header.appendChild(headerTag);
  header.addEventListener('click', () => { executeCmd('home'); focusInput(); });
  container.appendChild(header);

  const rootLabel = document.createElement('div');
  rootLabel.className = 'tree-root-label';
  rootLabel.textContent = 'home/';
  container.appendChild(rootLabel);

  const userLine = document.createElement('div');
  userLine.className = 'tree-user-line';
  const branch = document.createElement('span');
  branch.className = 'branch';
  branch.textContent = '└─';
  const username = document.createElement('span');
  username.className = 'username';
  username.style.marginLeft = '4px';
  username.textContent = 'user/';
  userLine.appendChild(branch);
  userLine.appendChild(username);
  container.appendChild(userLine);

  const home = fileSystem.children['home'];
  const user = home?.children['user'];
  if (!user || user.type !== 'dir') return;

  const childWrap = document.createElement('div');
  childWrap.className = 'tree-children';
  const children = Object.entries(user.children);
  children.forEach(([name, node], idx) => {
    childWrap.appendChild(
      buildTreeNode(name, node, ['home', 'user'], 1, idx === children.length - 1, '  ', currentPath)
    );
  });
  container.appendChild(childWrap);

  // Update status bar
  const cwdEl = document.getElementById('sidebar-cwd');
  const countEl = document.getElementById('sidebar-count');
  if (cwdEl) cwdEl.textContent = getPrompt(currentPath);
  if (countEl) {
    const curNode = getNodeAtPath(currentPath);
    const n = curNode?.type === 'dir' ? Object.keys(curNode.children).length : 0;
    countEl.textContent = `${n} item${n !== 1 ? 's' : ''}`;
  }
}

/* ══════════════════════════════════════
   TERMINAL STATE
══════════════════════════════════════ */
let termInput = '';
let termHistory = [];
let currentPath = ['home', 'user'];
let suggestion = '';
let cmdHistory = JSON.parse(localStorage.getItem('portfolio-cmd-history') || '[]');
let historyIdx = -1;
let nextId = 0;
let dropdownItems = [];
let dropdownIdx = -1;
let _argHint = '';
const collapsedDirs = new Set(JSON.parse(localStorage.getItem('portfolio-collapsed') || '[]'));
let activeFile = []; // path array of last cat-ed file

function persistCollapsed() {
  localStorage.setItem('portfolio-collapsed', JSON.stringify([...collapsedDirs]));
}

function persistCmdHistory() {
  // Keep last 100 commands
  const trimmed = cmdHistory.slice(-100);
  localStorage.setItem('portfolio-cmd-history', JSON.stringify(trimmed));
}

function getPrompt(path) {
  if (!path || !path.length) return '/';
  const p = '/' + path.join('/');
  if (p === '/home/user') return '~';
  if (p.startsWith('/home/user/')) return '~/' + p.slice('/home/user/'.length);
  return p;
}

/* ══════════════════════════════════════
   CLOCK + PATH
══════════════════════════════════════ */
function drawAnalogClock(now) {
  const canvas = document.getElementById('analog-clock');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 34;
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 2;
  const style = getComputedStyle(document.documentElement);
  const green = style.getPropertyValue('--green').trim();
  const gray6 = style.getPropertyValue('--gray-6').trim();
  const red   = style.getPropertyValue('--red').trim();

  ctx.clearRect(0, 0, size, size);

  // Face
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = gray6;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hour ticks
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
    ctx.lineTo(cx + Math.cos(a) * r,       cy + Math.sin(a) * r);
    ctx.strokeStyle = gray6;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const hrs = now.getHours() % 12;
  const min = now.getMinutes();
  const sec = now.getSeconds();

  // Hour hand
  const hAngle = ((hrs + min / 60) / 12) * 2 * Math.PI - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(hAngle) * r * 0.5, cy + Math.sin(hAngle) * r * 0.5);
  ctx.strokeStyle = green; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();

  // Minute hand
  const mAngle = ((min + sec / 60) / 60) * 2 * Math.PI - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(mAngle) * r * 0.72, cy + Math.sin(mAngle) * r * 0.72);
  ctx.strokeStyle = green; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.stroke();

  // Second hand
  const sAngle = (sec / 60) * 2 * Math.PI - Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sAngle) * r * 0.85, cy + Math.sin(sAngle) * r * 0.85);
  ctx.strokeStyle = red; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.stroke();

  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 1.5, 0, 2 * Math.PI);
  ctx.fillStyle = green; ctx.fill();
}

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('topbar-clock');
  if (el) el.textContent = `${h}:${m}:${s}`;
  drawAnalogClock(now);
}

function updateTopbarPath() {
  const el = document.getElementById('topbar-path');
  if (!el) return;
  el.innerHTML = '';

  const prefix = document.createElement('span');
  prefix.className = 'breadcrumb-static';
  prefix.textContent = 'root@portfolio:';
  el.appendChild(prefix);

  const prompt = getPrompt(currentPath);

  function addSeg(text, target) {
    const seg = document.createElement('span');
    seg.className = 'breadcrumb-seg';
    seg.textContent = text;
    seg.addEventListener('click', () => { executeCmd(`cd ${target}`); focusInput(); });
    el.appendChild(seg);
  }

  function addSep() {
    const sep = document.createElement('span');
    sep.className = 'breadcrumb-sep';
    sep.textContent = '/';
    el.appendChild(sep);
  }

  if (prompt === '~') {
    addSeg('~', '~');
  } else if (prompt.startsWith('~/')) {
    addSeg('~', '~');
    const parts = prompt.slice(2).split('/');
    parts.forEach((part, i) => {
      addSep();
      addSeg(part, '~/' + parts.slice(0, i + 1).join('/'));
    });
  } else {
    const parts = prompt.replace(/^\//, '').split('/').filter(Boolean);
    parts.forEach((part, i) => {
      addSep();
      addSeg(part, '/' + parts.slice(0, i + 1).join('/'));
    });
  }

  const dollar = document.createElement('span');
  dollar.className = 'breadcrumb-dollar';
  dollar.textContent = '$';
  el.appendChild(dollar);
}

/* ══════════════════════════════════════
   TYPEWRITER ANIMATION
══════════════════════════════════════ */
let abortAnimation = null;

function skipAnimation() {
  if (abortAnimation) { abortAnimation(); abortAnimation = null; }
}

function animateText(el, text, speed = 9) {
  skipAnimation();

  // Very long text: show instantly
  if (text.length > 700) { el.textContent = text; return; }

  let i = 0, stopped = false, timer;
  el.textContent = '';
  el.classList.add('typing-caret');

  abortAnimation = () => {
    stopped = true;
    clearTimeout(timer);
    el.textContent = text;
    el.classList.remove('typing-caret');
    abortAnimation = null;
  };

  function tick() {
    if (stopped) return;
    if (i < text.length) {
      el.textContent += text[i++];
      scrollToBottom();
      timer = setTimeout(tick, speed);
    } else {
      el.classList.remove('typing-caret');
      abortAnimation = null;
    }
  }
  tick();
}

/* ══════════════════════════════════════
   RENDER — split into two functions
   renderInput: called on every keystroke
   renderHistory: called only when history changes
══════════════════════════════════════ */
function renderInput() {
  const prompt = `root@portfolio:${getPrompt(currentPath)}$`;
  document.getElementById('prompt-current').textContent = prompt;
  document.getElementById('display-input').textContent = termInput;
  updateTopbarPath();

  const ghost = document.getElementById('ghost-text');
  ghost.textContent = '';
  ghost.className = '';
  ghost.removeAttribute('style');

  if (suggestion) {
    const offset = document.createElement('span');
    offset.style.opacity = '0';
    offset.textContent = termInput;
    const hint = document.createElement('span');
    hint.className = 'ghost-suggestion';
    hint.textContent = suggestion;
    ghost.appendChild(offset);
    ghost.appendChild(hint);
  } else if (_argHint) {
    const offset = document.createElement('span');
    offset.style.opacity = '0';
    offset.textContent = termInput;
    const hint = document.createElement('span');
    hint.style.cssText = 'color:var(--gray-6);opacity:0.6;font-style:italic';
    hint.textContent = _argHint;
    ghost.appendChild(offset);
    ghost.appendChild(hint);
  } else if (!termInput) {
    ghost.className = 'placeholder';
    ghost.textContent = 'try whoami, neofetch, or help…';
  }
}

function renderHistory(animateLast = false) {
  const container = document.getElementById('history');
  container.innerHTML = '';

  termHistory.forEach((item, idx) => {
    const isLast = idx === termHistory.length - 1;
    const wrap = document.createElement('div');
    wrap.className = 'history-item';

    const cmdLine = document.createElement('div');
    cmdLine.className = 'command-line';

    const promptSpan = document.createElement('span');
    promptSpan.className = 'prompt';
    promptSpan.textContent = `root@portfolio:${getPrompt(item.path)}$`;
    cmdLine.appendChild(promptSpan);

    if (item.command !== 'banner') {
      const cmdSpan = document.createElement('span');
      cmdSpan.className = 'command-text';
      cmdSpan.textContent = item.command;
      cmdLine.appendChild(cmdSpan);
    }

    const resp = document.createElement('div');
    resp.className = 'response' + (item.response.type === 'error' ? ' error' : '');

    const isTextType = item.response.type === 'text' || item.response.type === 'error';
    if (isTextType) {
      // Leave empty if this is the last item and we'll animate it
      if (isLast && animateLast) {
        resp.textContent = '';
      } else {
        resp.textContent = item.response.content || '';
      }
    } else if (item.response.type === 'node') {
      resp.appendChild(item.response.node.cloneNode(true));
    }

    wrap.appendChild(cmdLine);
    wrap.appendChild(resp);
    container.appendChild(wrap);

    // Fade-in animation on the last item
    if (isLast) {
      requestAnimationFrame(() => wrap.classList.add('animate-in'));
    }
  });

  renderInput();
  updateTopbarPath();
  scrollToBottom();

  // Typewriter for last text item
  if (animateLast && termHistory.length > 0) {
    const last = termHistory[termHistory.length - 1];
    if (last.response.type === 'text' || last.response.type === 'error') {
      const lastEl = container.lastElementChild?.querySelector('.response');
      if (lastEl) animateText(lastEl, last.response.content || '');
    }
  }
}

function scrollToBottom() {
  const el = document.getElementById('terminal-scroll');
  el.scrollTop = el.scrollHeight;
}

/* ══════════════════════════════════════
   EXECUTE
══════════════════════════════════════ */
function executeCmd(cmd, hideFromHistory = false) {
  if (!cmd.trim()) return;
  const cmdLower = cmd.trim().toLowerCase();

  // Cancel any in-progress typewriter before running new command
  skipAnimation();

  if (cmdLower === 'clear') {
    termHistory = [];
    renderHistory(false);
    return;
  }

  // Auto-clear previous output on each new command (keep terminal clean)
  if (!hideFromHistory) termHistory = [];

  const response = processCommand(cmd, currentPath);
  const activePath = [...currentPath];

  if (response.newPath) {
    currentPath = response.newPath;
    // Auto-expand all ancestors of new path so active node is always visible
    for (let i = 1; i <= currentPath.length; i++) {
      collapsedDirs.delete(currentPath.slice(0, i).join('/'));
    }
    renderFileTree();
  }

  if (!hideFromHistory) {
    termHistory.push({ id: nextId++, command: cmd.trim(), response, path: activePath });
  }

  if (cmdLower.startsWith('cd ') || cmdLower === 'cd' || cmdLower === 'home') {
    const lsResp = processCommand('ls', currentPath);
    termHistory.push({ id: nextId++, command: 'ls', response: lsResp, path: [...currentPath] });
  }

  if (cmdLower.startsWith('cat ') && response.type !== 'error') {
    const fileArg = cmd.trim().slice(4).trim();
    const { node: catNode, newPath: catResolved } = resolvePath(currentPath, fileArg);
    if (catNode && catNode.type === 'file') {
      activeFile = catResolved;
      renderFileTree();
    }
  }

  // Animate typewriter only for user-typed commands (not boot/sidebar)
  renderHistory(!hideFromHistory);
}

/* ══════════════════════════════════════
   AUTOCOMPLETE
══════════════════════════════════════ */
function updateSuggestion(val) {
  suggestion = '';
  _argHint = '';
  dropdownItems = [];
  dropdownIdx = -1;

  if (!val) { hideDropdown(); return; }

  const trimmed = val.trimStart();
  const trailingSpace = val.endsWith(' ');
  const spaceIdx = trimmed.indexOf(' ');

  if (spaceIdx === -1 && !trailingSpace) {
    // Command completion — history-first
    const cmd = trimmed;
    const histMatch = [...cmdHistory].reverse().find(h => {
      const first = h.trim().split(' ')[0].toLowerCase();
      return first.startsWith(cmd.toLowerCase()) && first !== cmd.toLowerCase();
    });
    if (histMatch) {
      suggestion = histMatch.trim().split(' ')[0].slice(cmd.length);
    } else {
      const m = COMMANDS.find(c => c.startsWith(cmd.toLowerCase()) && c !== cmd.toLowerCase());
      suggestion = m ? m.slice(cmd.length) : '';
    }
    hideDropdown();
    return;
  }

  const cmd = spaceIdx >= 0 ? trimmed.slice(0, spaceIdx) : trimmed;
  const rawArgs = spaceIdx >= 0 ? trimmed.slice(spaceIdx + 1) : '';
  const partial = trailingSpace ? '' : rawArgs.split(' ').pop();

  if (partial === '' && trailingSpace) {
    // Hint mode: no partial arg yet
    _argHint = ARG_HINTS[cmd.toLowerCase()] || '';
    hideDropdown();
    return;
  }

  const completions = getContextCompletions(cmd, currentPath, partial);

  if (completions.length === 0) {
    hideDropdown();
  } else if (completions.length === 1) {
    const match = completions[0];
    if (match.toLowerCase() !== partial.toLowerCase()) {
      suggestion = match.slice(partial.length);
    }
    hideDropdown();
  } else {
    dropdownItems = completions;
    renderDropdown();
  }
}

function renderDropdown() {
  const menu = document.getElementById('completion-menu');
  if (!menu) return;
  menu.innerHTML = '';
  const cmd = termInput.trimStart().split(' ')[0].toLowerCase();
  const isThemeOrOpen = cmd === 'theme' || cmd === 'open';

  dropdownItems.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'ci' + (i === dropdownIdx ? ' active' : '');

    const icon = document.createElement('span');
    icon.className = 'ci-icon';
    const label = document.createElement('span');

    if (isThemeOrOpen) {
      icon.textContent = cmd === 'theme' ? '◉' : '↗';
      label.className = 'ci-cmd';
      label.textContent = item;
    } else {
      const node = getNodeAtPath([...currentPath, item]);
      const isDir = node?.type === 'dir';
      icon.textContent = isDir ? '📁' : '📄';
      label.className = isDir ? 'ci-dir' : 'ci-file';
      label.textContent = item + (isDir ? '/' : '');
    }

    div.appendChild(icon);
    div.appendChild(label);
    div.addEventListener('mousedown', e => {
      e.preventDefault();
      applyDropdownSelection(i);
      hideDropdown();
      focusInput();
    });
    menu.appendChild(div);
  });
  menu.classList.add('open');
}

function hideDropdown() {
  const menu = document.getElementById('completion-menu');
  if (menu) menu.classList.remove('open');
  dropdownItems = [];
  dropdownIdx = -1;
}

function applyDropdownSelection(idx) {
  if (idx === undefined) idx = dropdownIdx < 0 ? 0 : dropdownIdx;
  if (idx < 0 || idx >= dropdownItems.length) return;
  const chosen = dropdownItems[idx];
  const parts = termInput.trimStart().split(' ');
  parts[parts.length - 1] = chosen;
  termInput = parts.join(' ');
  const input = document.getElementById('cmd-input');
  if (input) input.value = termInput;
  suggestion = '';
  _argHint = '';
  renderInput();
}

/* ══════════════════════════════════════
   SIDEBAR (mobile)
══════════════════════════════════════ */
let sidebarOpen = false;

function openSidebar() {
  sidebarOpen = true;
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-backdrop').classList.add('visible');
}

function closeSidebar() {
  sidebarOpen = false;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-backdrop').classList.remove('visible');
}

function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}

/* ══════════════════════════════════════
   NEOVIM ENGINE
══════════════════════════════════════ */
let nvimState = null;

function openNvim(filename, content, fileNode) {
  document.getElementById('cmd-input').blur();
  nvimState = {
    filename,
    fileNode,             // live reference into virtual filesystem
    lines: content.split('\n'),
    cursor: { row: 0, col: 0 },
    scrollTop: 0,
    mode: 'normal',
    cmdBuffer: '',
    pendingKey: '',
    isSearching: false,
    searchBuffer: '',
    searchPattern: '',
    searchMatches: [],
    searchIdx: -1,
    searchDir: 1,
    modified: false,
    message: '',
  };
  document.getElementById('nvim-overlay').classList.add('active');
  renderNvim();
}

function closeNvim() {
  document.getElementById('nvim-overlay').classList.remove('active');
  nvimState = null;
  focusInput();
}

function nvimVisibleRows() {
  const el = document.getElementById('nvim-editor');
  return Math.max(8, Math.floor(el.clientHeight / (13 * 1.5)));
}

function nvimScrollTo() {
  const vis = nvimVisibleRows();
  const { cursor } = nvimState;
  if (cursor.row < nvimState.scrollTop) nvimState.scrollTop = cursor.row;
  if (cursor.row >= nvimState.scrollTop + vis) nvimState.scrollTop = cursor.row - vis + 1;
}

function nvimClamp() {
  const { lines, cursor, mode } = nvimState;
  cursor.row = Math.max(0, Math.min(lines.length - 1, cursor.row));
  const len = lines[cursor.row]?.length || 0;
  cursor.col = mode === 'insert'
    ? Math.max(0, Math.min(len, cursor.col))
    : Math.max(0, Math.min(Math.max(0, len - 1), cursor.col));
}

function nvimScrollPct() {
  const { lines, cursor } = nvimState;
  if (lines.length <= 1) return 'All';
  if (cursor.row === 0) return 'Top';
  if (cursor.row >= lines.length - 1) return 'Bot';
  return Math.round((cursor.row / (lines.length - 1)) * 100) + '%';
}

function renderNvim() {
  if (!nvimState) return;
  nvimScrollTo();

  const { lines, cursor, mode, cmdBuffer, message, scrollTop } = nvimState;
  const vis = nvimVisibleRows();
  const editor = document.getElementById('nvim-editor');
  editor.innerHTML = '';

  for (let i = 0; i < vis; i++) {
    const row = scrollTop + i;
    const div = document.createElement('div');
    div.className = 'nvim-line';

    if (row < lines.length) {
      const line = lines[row];
      // Build segment list: normal text | search highlight | cursor
      const rowMatches = nvimState.searchMatches
        .filter(m => m.row === row)
        .map(m => ({ col: m.col, len: nvimState.searchPattern.length }));

      const renderLine = (text, cursorCol, insertMode) => {
        // Merge cursor and match positions into sorted segments
        let pos = 0;
        const segments = []; // {start, end, type: 'text'|'match'|'cursor'}
        rowMatches.forEach(m => { if (m.len > 0) segments.push({ start: m.col, end: m.col + m.len, type: 'match' }); });
        if (cursorCol !== null) segments.push({ start: cursorCol, end: cursorCol + 1, type: 'cursor' });
        segments.sort((a, b) => a.start - b.start);

        segments.forEach(seg => {
          if (pos < seg.start) div.appendChild(document.createTextNode(text.slice(pos, seg.start)));
          const span = document.createElement('span');
          if (seg.type === 'cursor') {
            span.className = insertMode ? 'nvim-cursor-insert' : 'nvim-cursor';
            span.textContent = insertMode ? '' : (text[seg.start] ?? ' ');
            div.appendChild(span);
            if (insertMode) div.appendChild(document.createTextNode(text[seg.start] ?? ''));
          } else {
            // search match — don't overlap with cursor
            const isCursorHere = cursorCol !== null && cursorCol >= seg.start && cursorCol < seg.end;
            if (!isCursorHere) {
              span.className = 'nvim-search-match';
              span.textContent = text.slice(seg.start, Math.min(seg.end, text.length));
              div.appendChild(span);
            } else {
              div.appendChild(document.createTextNode(text.slice(seg.start, Math.min(seg.end, text.length))));
            }
          }
          pos = Math.max(pos, seg.end);
        });
        if (pos < text.length) div.appendChild(document.createTextNode(text.slice(pos)));
      };

      if (row === cursor.row) {
        renderLine(line, cursor.col, mode === 'insert');
      } else {
        renderLine(line, null, false);
      }
    } else {
      div.classList.add('nvim-tilde');
      div.textContent = '~';
    }
    editor.appendChild(div);
  }

  // Statusline
  const modeLabel = { normal: '', insert: '-- INSERT --', command: '' }[mode] ?? '';
  const modified  = nvimState.modified ? ' [+]' : '';
  document.getElementById('nvim-mode-label').textContent = modeLabel;
  document.getElementById('nvim-file-label').textContent = nvimState.filename + modified;
  document.getElementById('nvim-pos-label').textContent =
    `${cursor.row + 1}:${cursor.col + 1}   ${nvimScrollPct()}`;

  // Cmdline
  const cmdEl = document.getElementById('nvim-cmdline');
  if (mode === 'command') {
    cmdEl.textContent = ':' + cmdBuffer;
  } else if (nvimState.isSearching) {
    const pfx = nvimState.searchDir === 1 ? '/' : '?';
    cmdEl.textContent = pfx + nvimState.searchBuffer;
  } else {
    cmdEl.textContent = message || '';
  }
}

function handleNvimKey(e) {
  if (!nvimState) return;

  if (nvimState.isSearching) { nvimSearchInput(e); renderNvim(); return; }

  const { mode } = nvimState;
  if (mode === 'normal')       nvimNormal(e);
  else if (mode === 'insert')  nvimInsert(e);
  else if (mode === 'command') nvimCommand(e);

  renderNvim();
}

/* Search input mode */
function nvimSearchInput(e) {
  const prefix = nvimState.searchDir === 1 ? '/' : '?';
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      nvimState.isSearching = false;
      nvimState.searchBuffer = '';
      nvimState.message = '';
      break;
    case 'Backspace':
      e.preventDefault();
      nvimState.searchBuffer = nvimState.searchBuffer.slice(0, -1);
      break;
    case 'Enter':
      e.preventDefault();
      nvimState.isSearching = false;
      nvimState.searchPattern = nvimState.searchBuffer;
      nvimState.searchBuffer = '';
      nvimDoSearch(nvimState.searchDir);
      break;
    default:
      if (e.key.length === 1) { e.preventDefault(); nvimState.searchBuffer += e.key; }
  }
}

function nvimDoSearch(dir) {
  const { lines, cursor, searchPattern } = nvimState;
  if (!searchPattern) return;
  let regex;
  try { regex = new RegExp(searchPattern, 'gi'); } catch { nvimState.message = 'E486: Bad pattern'; return; }

  const matches = [];
  lines.forEach((line, row) => {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(line)) !== null) matches.push({ row, col: m.index });
  });

  nvimState.searchMatches = matches;
  if (!matches.length) { nvimState.message = `E486: Pattern not found: ${searchPattern}`; return; }

  // Find first match after/before cursor based on dir
  const { row: cr, col: cc } = cursor;
  let found = -1;
  if (dir === 1) {
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (m.row > cr || (m.row === cr && m.col > cc)) { found = i; break; }
    }
    if (found === -1) found = 0;
  } else {
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      if (m.row < cr || (m.row === cr && m.col < cc)) { found = i; break; }
    }
    if (found === -1) found = matches.length - 1;
  }

  nvimState.searchIdx = found;
  cursor.row = matches[found].row;
  cursor.col = matches[found].col;
  nvimState.message = `${dir === 1 ? '/' : '?'}${searchPattern}  [${found + 1}/${matches.length}]`;
}

function nvimSearchNext(dir) {
  const { searchPattern, searchMatches } = nvimState;
  if (!searchPattern) { nvimState.message = 'E35: No previous search'; return; }
  if (!searchMatches.length) { nvimState.message = `E486: Pattern not found: ${searchPattern}`; return; }
  let idx = nvimState.searchIdx + dir;
  if (idx < 0) idx = searchMatches.length - 1;
  if (idx >= searchMatches.length) idx = 0;
  nvimState.searchIdx = idx;
  nvimState.cursor.row = searchMatches[idx].row;
  nvimState.cursor.col = searchMatches[idx].col;
  nvimState.message = `/${searchPattern}  [${idx + 1}/${searchMatches.length}]`;
}

function nvimNormal(e) {
  const { lines, cursor } = nvimState;
  const key = e.key;
  const pending = nvimState.pendingKey;
  e.preventDefault();

  // Two-key sequences
  if (pending === 'g' && key === 'g') { cursor.row = 0; cursor.col = 0; nvimState.pendingKey = ''; return; }
  if (pending === 'd' && key === 'd') {
    lines.splice(cursor.row, 1);
    if (!lines.length) lines.push('');
    nvimState.modified = true; nvimState.pendingKey = '';
    nvimClamp(); return;
  }
  if (pending === 'y' && key === 'y') { nvimState.message = '1 line yanked'; nvimState.pendingKey = ''; return; }
  if (pending === 'Z' && key === 'Z') { closeNvim(); return; }
  if (pending === 'Z' && key === 'Q') { closeNvim(); return; }

  nvimState.pendingKey = '';

  switch (key) {
    // Enter insert mode
    case 'i': nvimState.mode = 'insert'; break;
    case 'I': nvimState.mode = 'insert'; cursor.col = 0; break;
    case 'a': nvimState.mode = 'insert'; cursor.col = Math.min(cursor.col + 1, lines[cursor.row]?.length || 0); break;
    case 'A': nvimState.mode = 'insert'; cursor.col = lines[cursor.row]?.length || 0; break;
    case 'o':
      lines.splice(cursor.row + 1, 0, ''); cursor.row++; cursor.col = 0;
      nvimState.mode = 'insert'; nvimState.modified = true; break;
    case 'O':
      lines.splice(cursor.row, 0, ''); cursor.col = 0;
      nvimState.mode = 'insert'; nvimState.modified = true; break;
    // Motion
    case 'h': case 'ArrowLeft':  cursor.col = Math.max(0, cursor.col - 1); break;
    case 'l': case 'ArrowRight': cursor.col++; nvimClamp(); break;
    case 'j': case 'ArrowDown':  cursor.row++; nvimClamp(); break;
    case 'k': case 'ArrowUp':    cursor.row = Math.max(0, cursor.row - 1); nvimClamp(); break;
    case '0': cursor.col = 0; break;
    case '$': cursor.col = Math.max(0, (lines[cursor.row]?.length || 1) - 1); break;
    case 'G': cursor.row = lines.length - 1; nvimClamp(); break;
    case 'g': nvimState.pendingKey = 'g'; return;
    // Edit
    case 'd': nvimState.pendingKey = 'd'; return;
    case 'y': nvimState.pendingKey = 'y'; return;
    case 'x':
      if (lines[cursor.row]) {
        lines[cursor.row] = lines[cursor.row].slice(0, cursor.col) + lines[cursor.row].slice(cursor.col + 1);
        nvimState.modified = true; nvimClamp();
      }
      break;
    case 'p':
      nvimState.message = ''; break;
    // Command
    case ':': nvimState.mode = 'command'; nvimState.cmdBuffer = ''; break;
    case '/': nvimState.isSearching = true; nvimState.searchDir = 1;  nvimState.searchBuffer = ''; break;
    case '?': nvimState.isSearching = true; nvimState.searchDir = -1; nvimState.searchBuffer = ''; break;
    case 'n': nvimSearchNext(nvimState.searchDir); break;
    case 'N': nvimSearchNext(-nvimState.searchDir); break;
    case 'Z': nvimState.pendingKey = 'Z'; return;
    case 'Escape': nvimState.message = ''; nvimState.searchMatches = []; nvimState.searchIdx = -1; break;
    // Page scroll
    case 'PageDown': cursor.row = Math.min(lines.length - 1, cursor.row + nvimVisibleRows()); nvimClamp(); break;
    case 'PageUp':   cursor.row = Math.max(0, cursor.row - nvimVisibleRows()); nvimClamp(); break;
  }
}

function nvimInsert(e) {
  const { lines, cursor } = nvimState;
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      nvimState.mode = 'normal';
      cursor.col = Math.max(0, cursor.col - 1);
      nvimClamp();
      break;
    case 'Enter':
      e.preventDefault();
      const rest = lines[cursor.row].slice(cursor.col);
      lines[cursor.row] = lines[cursor.row].slice(0, cursor.col);
      lines.splice(cursor.row + 1, 0, rest);
      cursor.row++; cursor.col = 0;
      nvimState.modified = true;
      break;
    case 'Backspace':
      e.preventDefault();
      if (cursor.col > 0) {
        lines[cursor.row] = lines[cursor.row].slice(0, cursor.col - 1) + lines[cursor.row].slice(cursor.col);
        cursor.col--; nvimState.modified = true;
      } else if (cursor.row > 0) {
        const prevLen = lines[cursor.row - 1].length;
        lines[cursor.row - 1] += lines[cursor.row];
        lines.splice(cursor.row, 1);
        cursor.row--; cursor.col = prevLen;
        nvimState.modified = true;
      }
      break;
    case 'ArrowLeft':  e.preventDefault(); cursor.col = Math.max(0, cursor.col - 1); break;
    case 'ArrowRight': e.preventDefault(); cursor.col = Math.min(lines[cursor.row].length, cursor.col + 1); break;
    case 'ArrowUp':    e.preventDefault(); cursor.row = Math.max(0, cursor.row - 1); nvimClamp(); break;
    case 'ArrowDown':  e.preventDefault(); cursor.row = Math.min(lines.length - 1, cursor.row + 1); nvimClamp(); break;
    case 'Tab':
      e.preventDefault();
      lines[cursor.row] = lines[cursor.row].slice(0, cursor.col) + '  ' + lines[cursor.row].slice(cursor.col);
      cursor.col += 2; nvimState.modified = true;
      break;
    default:
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        lines[cursor.row] = lines[cursor.row].slice(0, cursor.col) + e.key + lines[cursor.row].slice(cursor.col);
        cursor.col++; nvimState.modified = true;
      }
  }
}

function nvimCommand(e) {
  switch (e.key) {
    case 'Escape':
      e.preventDefault();
      nvimState.mode = 'normal'; nvimState.cmdBuffer = '';
      break;
    case 'Backspace':
      e.preventDefault();
      nvimState.cmdBuffer = nvimState.cmdBuffer.slice(0, -1);
      if (!nvimState.cmdBuffer) nvimState.mode = 'normal';
      break;
    case 'Enter': {
      e.preventDefault();
      const cmd = nvimState.cmdBuffer.trim();
      nvimState.cmdBuffer = ''; nvimState.mode = 'normal';
      if (cmd === 'q') {
        if (nvimState.modified) { nvimState.message = 'E37: No write since last change (use :q! to override)'; break; }
        closeNvim();
      } else if (cmd === 'q!') {
        closeNvim();
      } else if (cmd === 'w' || cmd === 'wq' || cmd === 'wq!' || cmd === 'x' || cmd === 'x!') {
        // Write to the live virtual filesystem node
        if (nvimState.fileNode) {
          nvimState.fileNode.content = nvimState.lines.join('\n');
          nvimState.modified = false;
          nvimState.message = `"${nvimState.filename}" ${nvimState.lines.length}L written`;
        }
        if (cmd !== 'w') closeNvim();
      } else if (cmd === 'help' || cmd === 'h') {
        nvimState.message = ':w save  :wq save+quit  :q quit  :q! force quit  / search  n/N next/prev';
      } else {
        nvimState.message = `E492: Not an editor command: ${cmd}`;
      }
      break;
    }
    default:
      if (e.key.length === 1) { e.preventDefault(); nvimState.cmdBuffer += e.key; }
  }
}

/* ══════════════════════════════════════
   FOCUS HELPER
══════════════════════════════════════ */
function focusInput() {
  document.getElementById('cmd-input').focus();
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
function init() {
  const input = document.getElementById('cmd-input');
  const scroll = document.getElementById('terminal-scroll');

  // Input events
  input.addEventListener('input', e => {
    termInput = e.target.value;
    historyIdx = -1;
    updateSuggestion(termInput);
    renderInput(); // only re-render input area, not full history
  });

  input.addEventListener('keydown', e => {
    // Ctrl shortcuts
    if (e.ctrlKey) {
      switch (e.key) {
        case 'c': // cancel current input
          e.preventDefault();
          termInput = ''; input.value = ''; suggestion = ''; _argHint = '';
          hideDropdown(); renderInput(); return;
        case 'l': // clear terminal
          e.preventDefault();
          termHistory = []; renderHistory(); return;
        case 'u': // clear line
          e.preventDefault();
          termInput = ''; input.value = ''; suggestion = ''; _argHint = '';
          hideDropdown(); renderInput(); return;
        case 'w': { // delete last word
          e.preventDefault();
          const parts = termInput.trimEnd().split(' ');
          parts.pop();
          termInput = parts.length ? parts.join(' ') + ' ' : '';
          input.value = termInput; updateSuggestion(termInput); renderInput(); return;
        }
      }
    }

    if (e.key === 'Escape' && dropdownItems.length > 0) {
      e.preventDefault();
      hideDropdown();
      renderInput();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (dropdownItems.length > 1) {
        dropdownIdx = (dropdownIdx + 1) % dropdownItems.length;
        renderDropdown();
        applyDropdownSelection(dropdownIdx);
      } else if (dropdownItems.length === 1) {
        applyDropdownSelection(0);
        hideDropdown();
      } else if (suggestion) {
        termInput += suggestion;
        input.value = termInput;
        suggestion = '';
        _argHint = '';
        updateSuggestion(termInput);
        renderInput();
      }
      return;
    }

    if (e.key === 'ArrowRight' && suggestion) {
      e.preventDefault();
      termInput += suggestion;
      input.value = termInput;
      suggestion = '';
      _argHint = '';
      renderInput();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cmdHistory.length) return;
      historyIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      termInput = cmdHistory[cmdHistory.length - 1 - historyIdx];
      input.value = termInput;
      suggestion = '';
      renderInput();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIdx--;
      termInput = historyIdx < 0 ? (historyIdx = -1, '') : cmdHistory[cmdHistory.length - 1 - historyIdx];
      input.value = termInput;
      suggestion = '';
      renderInput();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      hideDropdown();
      const cmd = termInput.trim();
      if (cmd) { cmdHistory.push(cmd); historyIdx = -1; persistCmdHistory(); }
      executeCmd(termInput);
      termInput = '';
      input.value = '';
      suggestion = '';
      _argHint = '';
      renderInput();
      input.focus();
      return;
    }
  });

  // Click terminal area to focus
  scroll.addEventListener('click', focusInput);
  document.getElementById('input-line').addEventListener('click', focusInput);

  // Delegated click for ls items and theme buttons
  document.getElementById('history').addEventListener('click', e => {
    const item = e.target.closest('[data-cmd]');
    if (item) { executeCmd(item.dataset.cmd); focusInput(); }
  });

  // Mobile: hamburger
  document.getElementById('menu-btn').addEventListener('click', toggleSidebar);
  document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

  // Mobile quick commands
  document.getElementById('quick-cmds').addEventListener('click', e => {
    const btn = e.target.closest('.qcmd');
    if (!btn) return;
    executeCmd(btn.dataset.cmd);
    focusInput();
  });

  // Sidebar resize handle
  let isResizing = false;
  const sidebar = document.getElementById('sidebar');
  const handle = document.getElementById('resize-handle');

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    isResizing = true;
    document.body.classList.add('resizing');
  });
  window.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    document.body.classList.remove('resizing');
  });
  window.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const w = e.clientX;
    if (w >= 180 && w <= 560) {
      sidebar.style.width = w + 'px';
      document.documentElement.style.setProperty('--sidebar-w', w + 'px');
    }
  });

  // Skip animation on any keypress while animating
  input.addEventListener('keydown', () => skipAnimation(), { capture: true, passive: true });

  // Global: redirect all keypresses to the terminal input
  document.addEventListener('keydown', (e) => {
    // Nvim captures all keys when active
    if (nvimState) { handleNvimKey(e); return; }

    const tag = document.activeElement?.tagName;
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
    if (isEditable) return;

    if (e.key === 'Backspace') {
      e.preventDefault(); // stop browser back navigation
      input.focus();
      if (termInput.length > 0) {
        termInput = termInput.slice(0, -1);
        input.value = termInput;
        updateSuggestion(termInput);
        renderInput();
      }
      return;
    }

    // Ignore modifier-only combos (Ctrl+R, F5, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.startsWith('F') && e.key.length > 1) return;

    input.focus();
  });

  // Global: clicking anywhere non-interactive refocuses input
  document.addEventListener('click', (e) => {
    if (!e.target.closest('a, button, input, textarea, [contenteditable]')) {
      input.focus();
    }
  });

  // Apply saved theme on load
  applyTheme(activeTheme);

  // Render sidebar tree
  renderFileTree();

  // Live clock — start immediately, then tick every second
  updateClock();
  setInterval(updateClock, 1000);

  // Animated boot sequence
  boot();
}

async function boot() {
  // Step 1: banner (CSS handles the glow animation)
  const bannerResp = makeBanner();
  termHistory.push({ id: nextId++, command: 'banner', response: bannerResp, path: [...currentPath] });
  renderHistory(false);
  focusInput();

  // Step 2: ls fades in after banner glow settles
  await new Promise(r => setTimeout(r, 420));
  const lsResp = processCommand('ls', currentPath);
  termHistory.push({ id: nextId++, command: 'ls', response: lsResp, path: [...currentPath] });
  renderHistory(false);
  updateTopbarPath();
}

document.addEventListener('DOMContentLoaded', init);
