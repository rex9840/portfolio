import React from 'react';
import { fileSystem } from '../utils/fileSystem';
import type { File, Directory } from '../utils/fileSystem';

type FileTreeProps = {
    onNavigate: (cmd: string) => void;
};

type TreeNodeProps = {
    name: string;
    node: File | Directory;
    path: string[];
    onNavigate: (cmd: string) => void;
    level: number;
    isLast: boolean;
    parentPrefix: string;
};

const TreeNode: React.FC<TreeNodeProps> = ({
    name,
    node,
    path,
    onNavigate,
    level,
    isLast,
    parentPrefix
}) => {
    const isDir = node.type === 'dir';

    // Prefix for current node
    const currentPrefix = level === 0 ? '' : (isLast ? '└─' : '├─');

    // Prefix for children
    const childPrefix = parentPrefix + (level === 0 ? '' : (isLast ? '  ' : '│ '));

    const handleNav = (e: React.MouseEvent) => {
        e.stopPropagation();
        const parentPathStr = '/' + path.join('/');
        const fullPathStr = '/' + [...path, name].join('/');

        if (isDir) {
            onNavigate(`cd ${fullPathStr}`);
        } else {
            onNavigate(`cd ${parentPathStr}`);
            setTimeout(() => {
                onNavigate(`cat ${name}`);
            }, 50);
        }
    }

    const children = isDir ? Object.entries((node as Directory).children) : [];

    return (
        <div className="select-none font-mono text-xs">
            <div
                className="flex items-center hover:bg-white/10 cursor-pointer rounded-sm px-1 py-0.5 group"
                onClick={handleNav}
            >
                <span className="text-gray-600 shrink-0 whitespace-pre">
                    {parentPrefix}{currentPrefix}
                </span>

                <span className={`whitespace-nowrap ${isDir ? "text-blue-400 font-bold" : "text-gray-300"} group-hover:text-[#00ff41]`}>
                    {name}{isDir ? '/' : ''}
                </span>
            </div>

            {isDir && (
                <div>
                    {children.map(([childName, childNode], index) => (
                        <TreeNode
                            key={childName}
                            name={childName}
                            node={childNode}
                            path={[...path, name]}
                            onNavigate={onNavigate}
                            level={level + 1}
                            isLast={index === children.length - 1}
                            parentPrefix={childPrefix}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const FileTree: React.FC<FileTreeProps> = ({ onNavigate }) => {
    // Access /home/user directly to avoid redundant nesting in the display
    const home = (fileSystem.children['home'] as Directory);
    const user = (home?.children['user'] as Directory);
    const rootChildren = user ? Object.entries(user.children) : [];

    return (
        <div className="font-mono text-[11px] h-full p-2 bg-[#0b0e14]">
            <div
                className="flex items-center justify-between mb-4 pb-1 border-b border-gray-800/50 cursor-pointer group"
                onClick={() => onNavigate('home')}
            >
                <span className="text-gray-600 font-bold group-hover:text-[#00ff41]">EXP</span>
                <span className="text-gray-700 text-[9px] group-hover:text-[#00ff41] font-mono">[~]</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
                <div className="text-gray-500 mb-1">home/</div>
                <div className="flex items-center text-gray-400 mb-1">
                    <span className="text-gray-600 shrink-0">└─</span>
                    <span className="ml-1 text-blue-500 font-bold">user/</span>
                </div>

                <div className="ml-4">
                    {rootChildren.map(([name, node], index) => (
                        <TreeNode
                            key={name}
                            name={name}
                            node={node}
                            path={['home', 'user']}
                            onNavigate={onNavigate}
                            level={1}
                            isLast={index === rootChildren.length - 1}
                            parentPrefix="  "
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
