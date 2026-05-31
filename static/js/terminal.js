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
              'README.md': { type: 'file', content: config.readme },
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

/* ══════════════════════════════════════
   COMMANDS
══════════════════════════════════════ */
const COMMANDS = [
  'help', 'ls', 'cat', 'cd', 'clear', 'home', 'pwd',
  'banner', 'whoami', 'contact', 'skills', 'projects', 'experience',
  'theme', 'open',
];

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
  ls [dir]       List directory contents
  cd <dir>       Change directory
  cat <file>     Read file content
  clear          Clear terminal
  pwd            Print working directory
  home           Go to home directory
  whoami         Show user identity
  contact        Show contact info
  skills         List skills
  projects       List projects (with GitHub links)
  experience     Show work experience
  open <url>     Open URL in new tab (or: open github / open linkedin)
  theme list     Show available themes
  theme <name>   Switch theme (matrix · amber · nord · dracula)
  help           Show this message

Tips: Tab/→ autocomplete · ↑/↓ history (persisted across sessions)`
      };

    case 'pwd':
      return { type: 'text', content: '/' + currentPath.join('/') };

    case 'whoami':
      return { type: 'text', content: config.profile.name };

    case 'banner':
      return makeBanner();

    case 'home':
      return { ...makeBanner(), newPath: ['home', 'user'] };

    case 'contact':
      return {
        type: 'text',
        content: `Email:    ${config.profile.email}\nGitHub:   ${config.profile.github}\nLinkedIn: ${config.profile.linkedin}`
      };

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

    case 'open': {
      if (!args.length) return { type: 'error', content: 'usage: open <url|github|linkedin>' };
      let url = args[0];
      if (url === 'github')   url = config.profile.github;
      if (url === 'linkedin') url = config.profile.linkedin;
      if (!url.startsWith('http')) url = 'https://' + url;
      window.open(url, '_blank', 'noopener,noreferrer');
      return { type: 'text', content: `Opening ${url} ...` };
    }

    default:
      return { type: 'error', content: `Command not found: ${command}` };
  }
}

/* ══════════════════════════════════════
   FILE TREE
══════════════════════════════════════ */
function buildTreeNode(name, node, path, level, isLast, parentPrefix) {
  const isDir = node.type === 'dir';
  const currentPrefix = level === 0 ? '' : (isLast ? '└─' : '├─');
  const childPrefix = parentPrefix + (level === 0 ? '' : (isLast ? '  ' : '│ '));

  const wrap = document.createElement('div');

  const row = document.createElement('div');
  row.className = 'tree-node';

  const pre = document.createElement('span');
  pre.className = 'tree-prefix';
  pre.textContent = parentPrefix + currentPrefix;

  const label = document.createElement('span');
  label.className = 'tree-node-name ' + (isDir ? 'dir' : 'file');
  label.textContent = name + (isDir ? '/' : '');

  row.appendChild(pre);
  row.appendChild(label);
  row.addEventListener('click', e => {
    e.stopPropagation();
    const fullPath = '/' + [...path, name].join('/');
    if (isDir) {
      executeCmd(`cd ${fullPath}`);
    } else {
      executeCmd(`cd /${path.join('/')}`);
      executeCmd(`cat ${name}`);
    }
    closeSidebar();
    focusInput();
  });

  wrap.appendChild(row);

  if (isDir) {
    const children = Object.entries(node.children);
    children.forEach(([childName, childNode], idx) => {
      wrap.appendChild(
        buildTreeNode(childName, childNode, [...path, name], level + 1, idx === children.length - 1, childPrefix)
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
  headerTag.textContent = '[~]';
  header.appendChild(headerTitle);
  header.appendChild(headerTag);
  header.addEventListener('click', () => { executeCmd('home'); closeSidebar(); focusInput(); });
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
      buildTreeNode(name, node, ['home', 'user'], 1, idx === children.length - 1, '  ')
    );
  });
  container.appendChild(childWrap);
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
function updateClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  el.textContent = `${h}:${m}:${s}`;
}

function updateTopbarPath() {
  const el = document.getElementById('topbar-path');
  if (el) el.textContent = `root@portfolio:${getPrompt(currentPath)}$`;
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
  if (suggestion) {
    // Safe: use textContent nodes, no innerHTML
    ghost.textContent = '';
    const hidden = document.createElement('span');
    hidden.style.opacity = '0';
    hidden.textContent = termInput;
    const visible = document.createTextNode(suggestion);
    ghost.appendChild(hidden);
    ghost.appendChild(visible);
  } else {
    ghost.textContent = '';
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

  if (response.newPath) currentPath = response.newPath;

  if (!hideFromHistory) {
    termHistory.push({ id: nextId++, command: cmd.trim(), response, path: activePath });
  }

  if (cmdLower.startsWith('cd ') || cmdLower === 'cd' || cmdLower === 'home') {
    const lsResp = processCommand('ls', currentPath);
    termHistory.push({ id: nextId++, command: 'ls', response: lsResp, path: [...currentPath] });
  }

  // Animate typewriter only for user-typed commands (not boot/sidebar)
  renderHistory(!hideFromHistory);
}

/* ══════════════════════════════════════
   AUTOCOMPLETE
══════════════════════════════════════ */
function updateSuggestion(val) {
  if (!val) { suggestion = ''; return; }
  const [cmd, ...args] = val.trimStart().split(' ');
  if (!args.length) {
    const match = COMMANDS.find(c => c.startsWith(cmd.toLowerCase()) && c !== cmd.toLowerCase());
    suggestion = match ? match.slice(cmd.length) : '';
  } else {
    const partial = args[args.length - 1];
    const completions = getCompletions(currentPath, partial);
    const match = completions.find(
      c => c.toLowerCase().startsWith(partial.toLowerCase()) && c.toLowerCase() !== partial.toLowerCase()
    );
    suggestion = match ? match.slice(partial.length) : '';
  }
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
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
      e.preventDefault();
      termInput += suggestion;
      input.value = termInput;
      suggestion = '';
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
      const cmd = termInput.trim();
      if (cmd) { cmdHistory.push(cmd); historyIdx = -1; persistCmdHistory(); }
      executeCmd(termInput);
      termInput = '';
      input.value = '';
      suggestion = '';
      // renderHistory already called inside executeCmd
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
