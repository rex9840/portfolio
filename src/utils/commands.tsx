import React from 'react';
import { resolvePath } from './fileSystem';
import type { File, Directory } from './fileSystem';

export const COMMANDS = [
    'help', 'ls', 'cd', 'cat', 'clear', 'home',
    'banner', 'whoami', 'contact', 'skills',
    'projects', 'experience'
];

export type CommandResponse = {
    type: 'text' | 'html' | 'error';
    content: string | React.ReactNode;
    newPath?: string[];
    terminating?: boolean; // Signal to clear or other non-print actions
};

const BANNER_CONTENT = (
    <div className="mb-6 font-mono">
        <pre className="text-[#00ff41] font-bold text-xs md:text-sm leading-none overflow-x-auto whitespace-pre">
            {`╔═══════════════════════════════════════════════════════════════╗
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
╚═══════════════════════════════════════════════════════════════╝`}
        </pre>
        <div className="mt-4 text-gray-400 text-sm">
            <div className="flex items-start gap-2">
                <span className="text-[#00ff41]">»</span>
                <div>
                    <div className="mb-1">Welcome to Rupesh Nepal's terminal portfolio</div>
                    <div className="text-xs opacity-75 leading-tight">Type <span className="text-[#00ff41] font-bold">help</span> for available commands</div>
                </div>
            </div>
        </div>
    </div>
);

export const processCommand = (
    cmd: string,
    currentPath: string[],
    onExecute: (cmd: string) => void
): CommandResponse => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            return {
                type: 'text',
                content: `Available commands:
  ls [dir]    - List directory contents
  cd <dir>    - Change directory
  cat <file>  - Read file content
  clear       - Clear terminal history
  pwd         - Print working directory
  home        - Go to home directory
  banner      - Show welcome banner
  help        - Show this message
  whoami        - Show user identity` 
            };

        case 'pwd':
            return {
                type: 'text',
                content: '/' + currentPath.join('/')
            };

        case 'cd':
            if (args.length === 0) {
                // Default to home
                return {
                    type: 'text',
                    content: '',
                    newPath: ['home', 'user']
                };
            }

            const { node: targetNode, newPath } = resolvePath(currentPath, args[0]);

            if (!targetNode) {
                return { type: 'error', content: `cd: ${args[0]}: No such file or directory` };
            }
            if (targetNode.type !== 'dir') {
                return { type: 'error', content: `cd: ${args[0]}: Not a directory` };
            }

            return {
                type: 'text',
                content: '',
                newPath: newPath
            };

        case 'ls':
        case 'll': // alias
            const listPath = args.length > 0 ? args[0] : '.';
            const { node: lsNode, newPath: resolvedLSPath } = resolvePath(currentPath, listPath);

            if (!lsNode) {
                return { type: 'error', content: `ls: ${listPath}: No such file or directory` };
            }
            if (lsNode.type !== 'dir') {
                return { type: 'text', content: listPath }; // listing a file just shows name
            }

            const contents = Object.entries((lsNode as Directory).children).map(([name, item]) => ({
                name,
                type: item.type,
                // Construct absolute path for clicks
                absPath: ['/', ...resolvedLSPath, name].join('/').replace(/\/+/g, '/')
            }));

            return {
                type: 'html',
                content: (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {contents.map(item => (
                            <div
                                key={item.name}
                                className="cursor-pointer hover:bg-white/10 p-1 rounded flex items-center gap-2 group"
                                onClick={() => {
                                    if (item.type === 'dir') {
                                        onExecute(`cd ${item.absPath}`);
                                    } else {
                                        onExecute(`cat ${item.absPath}`);
                                    }
                                }}
                            >
                                <span className={item.type === 'dir' ? "text-blue-400" : "text-green-400"}>
                                    {item.type === 'dir' ? '📁' : '📄'}
                                </span>
                                <span className={`${item.type === 'dir' ? "text-blue-400 font-bold" : "text-gray-300"} group-hover:underline`}>
                                    {item.name}{item.type === 'dir' ? '/' : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                )
            };

        case 'cat':
            if (args.length === 0) return { type: 'error', content: 'usage: cat <file>' };

            const { node: catNode } = resolvePath(currentPath, args[0]);

            if (!catNode) {
                return { type: 'error', content: `cat: ${args[0]}: No such file or directory` };
            }
            if (catNode.type === 'dir') {
                return { type: 'error', content: `cat: ${args[0]}: Is a directory` };
            }

            return {
                type: 'text',
                content: (catNode as File).content
            };

        case 'banner':
            return {
                type: 'html',
                content: BANNER_CONTENT
            };

        case 'home':
            return {
                type: 'html',
                content: BANNER_CONTENT,
                newPath: ['home', 'user']
            };

        case 'whoami':
            return {
                type: 'text',
                content: 'Rupesh Nepal'
            };

        default:
            return {
                type: 'error',
                content: `Command not found: ${command}`
            };
    }
};
