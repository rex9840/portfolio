import { config } from '../config';

export type File = {
    type: 'file';
    content: string;
};

export type Directory = {
    type: 'dir';
    children: Record<string, File | Directory>;
};

// Helper to sanitize filenames
const sanitize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.txt';

// Generate dynamic filesystem from config
const generateFileSystem = (): Directory => {
    // 1. Generate Projects
    const projectFiles: Record<string, File> = {};
    config.projects.forEach(p => {
        projectFiles[sanitize(p.name)] = {
            type: 'file',
            content: `Title: ${p.name}\nTech Stack: ${p.tech}\n------------------------\n${p.description}`
        };
    });

    // 2. Generate Experience
    const experienceFiles: Record<string, File> = {};
    config.experience.forEach(e => {
        experienceFiles[sanitize(e.company)] = {
            type: 'file',
            content: `Role: ${e.role}\nCompany: ${e.company}\nPeriod: ${e.period}\n------------------------\nSummary:\n${e.details.map(d => `- ${d}`).join('\n')}`
        };
    });

    // 3. Generate Custom Files
    const customFiles: Record<string, File> = {};
    if (config.customFiles) {
        Object.entries(config.customFiles).forEach(([name, content]) => {
            customFiles[name] = { type: 'file', content: content as string };
        });
    }

    // 4. Build Final Structure
    return {
        type: 'dir',
        children: {
            'home': {
                type: 'dir',
                children: {
                    'user': {
                        type: 'dir',
                        children: {
                            'bio.txt': {
                                type: 'file',
                                content: `Name: ${config.profile.name}\nLocation: ${config.profile.location}\n\n${config.profile.bio}`
                            },
                            'skills.txt': {
                                type: 'file',
                                content: config.profile.skills.join('\n')
                            },
                            'contact.txt': {
                                type: 'file',
                                content: `Email: ${config.profile.email}\nPhone: ${config.profile.phone}\nGitHub: ${config.profile.github}\nLinkedIn: ${config.profile.linkedin}`
                            },
                            'projects': {
                                type: 'dir',
                                children: projectFiles
                            },
                            'experience': {
                                type: 'dir',
                                children: experienceFiles
                            },
                            'README.md': {
                                type: 'file',
                                content: config.readme
                            },
                            ...customFiles
                        }
                    }
                }
            }
        }
    };
};

export const fileSystem = generateFileSystem();

export const resolvePath = (currentPath: string[], targetPath: string): { node: File | Directory | null, newPath: string[] } => {
    if (targetPath === '/') return { node: fileSystem, newPath: [] };

    let pathStack: string[];
    let remainingPath: string;

    if (targetPath.startsWith('~')) {
        pathStack = ['home', 'user'];
        remainingPath = targetPath.slice(1).startsWith('/') ? targetPath.slice(2) : targetPath.slice(1);
    } else if (targetPath.startsWith('/')) {
        pathStack = [];
        remainingPath = targetPath.slice(1);
    } else {
        pathStack = [...currentPath];
        remainingPath = targetPath;
    }

    const parts = remainingPath.split('/').filter(p => p);

    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
            if (pathStack.length > 0) pathStack.pop();
            continue;
        }
        pathStack.push(part);
    }

    let currentNode: File | Directory = fileSystem;
    for (const part of pathStack) {
        if (currentNode.type !== 'dir') return { node: null, newPath: currentPath };
        if (!currentNode.children[part]) return { node: null, newPath: currentPath };
        currentNode = currentNode.children[part];
    }

    return { node: currentNode, newPath: pathStack };
};

export const getNodeAtPath = (pathParts: string[]): File | Directory | null => {
    let current: File | Directory = fileSystem;
    for (const part of pathParts) {
        if (current.type !== 'dir' || !current.children[part]) return null;
        current = current.children[part];
    }
    return current;
};

export const getCompletions = (currentPath: string[], partial: string): string[] => {
    const node = getNodeAtPath(currentPath);
    if (!node || node.type !== 'dir') return [];

    return Object.keys(node.children).filter(name =>
        name.toLowerCase().startsWith(partial.toLowerCase())
    );
};
