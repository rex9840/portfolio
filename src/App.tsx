import { useState, useEffect, useRef, useCallback } from 'react';
import { processCommand, COMMANDS } from './utils/commands';
import type { CommandResponse } from './utils/commands';
import { FileTree } from './components/FileTree';
import { getCompletions } from './utils/fileSystem';
import './index.css';

type HistoryItem = {
  command: string;
  response: CommandResponse;
  path?: string[];
};

function App() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>(['home', 'user']);
  const currentPathRef = useRef<string[]>(['home', 'user']);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  // Sync ref with state
  useEffect(() => {
    currentPathRef.current = currentPath;
  }, [currentPath]);

  // Resize logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth >= 150 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // Autocomplete Logic
  useEffect(() => {
    if (!input) {
      setSuggestion('');
      return;
    }

    const [cmd, ...args] = input.trimStart().split(' ');

    if (args.length === 0) {
      // Suggest commands
      const match = COMMANDS.find(c => c.startsWith(cmd.toLowerCase()) && c !== cmd.toLowerCase());
      setSuggestion(match ? match.slice(cmd.length) : '');
    } else {
      // Suggest files/dirs
      const partial = args[args.length - 1];
      const completions = getCompletions(currentPath, partial);
      const match = completions.find(c => c.toLowerCase().startsWith(partial.toLowerCase()) && c.toLowerCase() !== partial.toLowerCase());
      setSuggestion(match ? match.slice(partial.length) : '');
    }
  }, [input, currentPath]);

  // Helper to force execution of a command
  const executeCommand = (cmd: string, hideFromHistory = false) => {
    if (!cmd.trim()) return;

    const commandLower = cmd.trim().toLowerCase();
    const activePath = currentPathRef.current; // Always use the latest path

    if (commandLower === 'clear') {
      setHistory([]);
      setInput('');
      setSuggestion('');
      return;
    }

    const response = processCommand(cmd, activePath, executeCommand);

    // Optimistic path update
    let nextPath = activePath;
    if (response.newPath) {
      setCurrentPath(response.newPath);
      currentPathRef.current = response.newPath; // Immediate update for same-command logic
      nextPath = response.newPath;
    }

    if (!hideFromHistory) {
      setHistory(prev => [...prev, {
        command: cmd,
        response,
        path: [...activePath] // Use the path from when command was started
      }]);
    }

    // Auto-LS Logic: If command was 'cd ...' or 'home', run 'ls' automatically
    if (commandLower.startsWith('cd ') || commandLower === 'cd' || commandLower === 'home') {
      setTimeout(() => {
        const lsResponse = processCommand('ls', nextPath, executeCommand);
        setHistory(prev => [...prev, {
          command: 'ls',
          response: lsResponse,
          path: [...nextPath]
        }]);
      }, 50);
    }

    // Always refocus after command (critical for sidebar clicks)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && suggestion) {
      e.preventDefault();
      setInput(input + suggestion);
      setSuggestion('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(input);
    setInput('');
    setSuggestion('');
  };

  useEffect(() => {
    // Auto scroll to bottom with high reliability
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };

    // Initial scroll
    scrollToBottom();

    // Delayed scroll for dynamic content updates
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [history]);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initial Load Sequence
    executeCommand('banner');
    executeCommand('ls'); // Restore initial list

    inputRef.current?.focus();
  }, []);

  const getPrompt = (path: string[] | undefined) => {
    if (!path || path.length === 0) return '/';
    const p = '/' + path.join('/');
    // Map /home/user to ~
    if (p === '/home/user') return '~';
    if (p.startsWith('/home/user/')) return '~/' + p.replace('/home/user/', '');
    return p;
  }

  return (
    <div
      className={`min-h-screen w-full bg-[#0d1117] text-[#f8f8f2] relative overflow-x-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Scanline Effect - Lower z-index */}
      <div className="scanline pointer-events-none fixed inset-0 z-10"></div>

      {/* Main Terminal Section */}
      <main
        className={`min-h-screen ${isResizing ? '' : 'transition-all duration-300'}`}
        style={{ paddingLeft: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
      >
        <div className="p-4 md:p-8 overflow-y-auto max-h-screen flex flex-col" ref={scrollRef}>
          {history.map((item, i) => (
            <div key={i} className="history-item mb-4">
              <div className="command-line flex items-center font-mono text-sm leading-tight">
                <span className="prompt text-[#00ff41] shrink-0">root@portfolio:{getPrompt(item.path)}$</span>
                <span className="command ml-2 text-white">{item.command === 'banner' ? '' : item.command}</span>
              </div>
              <div className={`response ${item.response.type} mt-1 font-mono leading-relaxed text-sm whitespace-pre-wrap`}>
                {item.response.content}
              </div>
            </div>
          ))}

          {/* Always show current prompt with inline input */}
          <div className="input-line flex items-center font-mono text-sm mt-4 relative">
            <span className="prompt text-[#00ff41] shrink-0 mr-1">root@portfolio:{getPrompt(currentPath)}$</span>
            <div className="flex-1 flex items-center mt-0 relative overflow-hidden">
              <span className="text-[#f8f8f2] whitespace-pre break-all z-10">{input}</span>
              {/* Suggestion Text (Ghost Text) */}
              {suggestion && (
                <span className="text-gray-600 whitespace-pre absolute left-0 z-0 pointer-events-none opacity-50">
                  <span className="opacity-0">{input}</span>
                  {suggestion}
                </span>
              )}
              <span className="terminal-cursor"></span>
              <form onSubmit={handleSubmit} className="absolute inset-0 opacity-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-full opacity-0 pointer-events-auto cursor-default focus:outline-none"
                  autoFocus
                  spellCheck="false"
                  autoComplete="off"
                />
              </form>
            </div>
          </div>

          {/* Bottom padding for scroll space */}
          <div className="h-[20vh]"></div>
        </div>
      </main>

      {/* FIXED Left Sidebar - Vim REX style (Wider, Non-scrollable, Bordered) */}
      <aside
        className={`fixed left-0 top-0 h-screen z-50 overflow-visible group ${isResizing ? '' : 'transition-all duration-300'}`}
        style={{ width: isSidebarOpen ? `${sidebarWidth}px` : '0px' }}
      >
        <div className="w-full h-full bg-[#0b0e14] border-r border-gray-700 shadow-2xl overflow-hidden flex flex-col relative">
          <FileTree
            onNavigate={(cmd) => executeCommand(cmd)}
          />
        </div>

        {/* Resize Handle - Outside overflow-hidden for better hit area */}
        <div
          onMouseDown={startResizing}
          className={`absolute top-0 -right-2 w-4 h-full cursor-col-resize z-[100] group/handle`}
        >
          <div className={`w-[2px] h-full ml-auto transition-colors ${isResizing ? 'bg-[#00ff41]' : 'group-hover/handle:bg-[#00ff41]/50'}`} />
        </div>
      </aside>
    </div>
  );
}

export default App;
