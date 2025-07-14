

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { appState } from './state';
import { getMimeType, scrollToBottom } from './utils';
import { renderFileTree, switchTab, renderEditorTab, renderVfsShellEntry } from './ui';
import { renderAssetManager } from './persistence';
import * as dom from './dom';

export function getFileContentAsBlob(path: string): Blob | any[] | undefined {
    const content = appState.vfsBlob[path];
    if (content instanceof Blob || Array.isArray(content)) {
        return content;
    }
    if (typeof content === 'string') {
        return new Blob([content], { type: getMimeType(path) });
    }
    return undefined;
}

export async function getFileContentAsText(path: string): Promise<string | undefined> {
    const content = appState.vfsBlob[path];
    if (content instanceof Blob) {
        return await content.text();
    }
    if (typeof content === 'string') {
        return content;
    }
     if (Array.isArray(content)) {
        return JSON.stringify(content, null, 2);
    }
    return undefined;
}

export function saveFileToVFS(filePath: string, content: string | Blob) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: getMimeType(filePath) });
    appState.vfsBlob[filePath] = blob;
    // UI updates should be called by the event handler that calls this function.
}

export function deleteFileFromVFS(filePath: string) {
    if (appState.vfsBlob[filePath] !== undefined) {
        delete appState.vfsBlob[filePath];
        if (appState.activeFilePath === filePath) {
            appState.activeFilePath = null;
        }
        return true;
    }
    return false;
}

export async function switchFile(filePath: string) {
    const content = appState.vfsBlob[filePath];
    if (content === undefined) {
        console.warn(`switchFile: File not found in vfsBlob: ${filePath}`);
        return;
    }

    appState.activeFilePath = filePath;

    if (filePath === "0index.html") {
        if (dom.codeEditor) dom.codeEditor.style.display = 'none';
        if (dom.codePreview) {
            dom.codePreview.style.display = 'block';
            const blobContent = getFileContentAsBlob(filePath) as Blob;
            if(dom.codePreview.src) URL.revokeObjectURL(dom.codePreview.src);
            dom.codePreview.src = URL.createObjectURL(blobContent);
        }
    } else {
        if (dom.codeEditor) {
            dom.codeEditor.style.display = 'block';
            dom.codeEditor.value = await getFileContentAsText(filePath) ?? '';
        }
        if (dom.codePreview) dom.codePreview.style.display = 'none';
    }
    
    renderFileTree();
    await switchTab('code-editor-tab');
}

export function getFileContent(path: string): string | Blob | any[] | undefined {
    return appState.vfsBlob[path];
}

export function updateActiveFileContent(content: string) {
    if (appState.activeFilePath) {
        saveFileToVFS(appState.activeFilePath, content);
    }
}

// --- VI MODE ---

export async function saveAndExitViMode() {
    if (!appState.vfsViIsActive || !appState.vfsViCurrentFile || !dom.vfsViTextarea) return;

    const filePath = appState.vfsViCurrentFile;
    const content = dom.vfsViTextarea.value;
    
    saveFileToVFS(filePath, content);
    renderVfsShellEntry(`:wq ${filePath}`, `"${filePath}" updated.`);
    renderFileTree();
    renderEditorTab();
    renderAssetManager();

    quitViMode(true);
}

export function quitViMode(isSaving = false) {
    if (!dom.vfsViEditorOverlay || !dom.vfsViTextarea) return;

    dom.vfsViEditorOverlay.classList.add('hidden');
    dom.vfsViTextarea.value = '';
    appState.vfsViIsActive = false;
    appState.vfsViCurrentFile = null;
    if (!isSaving) {
        renderVfsShellEntry(':q', 'Quit vi.');
    }
    dom.vfsShellInput?.focus();
}

async function enterViMode(filePath: string): Promise<CommandOutput> {
    const fileContent = await getFileContentAsText(filePath);
    if (fileContent === undefined) {
        // If file doesn't exist, create it in vi mode
        saveFileToVFS(filePath, '');
        renderFileTree();
        renderEditorTab();
    }
    if (!dom.vfsViEditorOverlay || !dom.vfsViFilename || !dom.vfsViTextarea) {
        return { output: `vi: editor DOM elements not found`, error: true };
    }

    appState.vfsViIsActive = true;
    appState.vfsViCurrentFile = filePath;

    dom.vfsViFilename.textContent = filePath;
    dom.vfsViTextarea.value = await getFileContentAsText(filePath) ?? '';
    dom.vfsViEditorOverlay.classList.remove('hidden');
    dom.vfsViTextarea.focus();

    return { output: `Opening ${filePath} in vi. Use Ctrl+S to save and exit, Ctrl+Q to quit.` };
}


// --- VFS SHELL ---

type CommandOutput = { output: string; error?: boolean };

function handleLs(path = '/'): CommandOutput {
    const normalizedPath = path.endsWith('/') || path.length === 0 ? path : path + '/';
    const entries = new Set<string>();

    Object.keys(appState.vfsBlob).forEach(p => {
        if (p.startsWith(normalizedPath)) {
            const remaining = p.substring(normalizedPath.length);
            if (remaining) {
                const firstPart = remaining.split('/')[0];
                const isDir = remaining.includes('/');
                entries.add(firstPart + (isDir ? '/' : ''));
            }
        }
    });

    if (normalizedPath === '/') {
        Object.keys(appState.vfsBlob).forEach(p => {
            if (!p.includes('/')) {
                entries.add(p);
            }
        });
    }
    
    const parentPath = path.substring(0, path.lastIndexOf('/'));
     const parentFiles = Object.keys(appState.vfsBlob).filter(p => p.startsWith(parentPath) && !p.substring(parentPath.length+1).includes('/'));

    if (entries.size === 0 && parentFiles.every(p => p !== path)) {
        return { output: `ls: cannot access '${path}': No such file or directory`, error: true };
    }

    return { output: Array.from(entries).sort().join('\n') || '.' };
}


async function handleCat(path?: string): Promise<CommandOutput> {
    if (!path) return { output: 'cat: missing operand', error: true };
    const content = await getFileContentAsText(path);
    if (content === undefined) return { output: `cat: ${path}: No such file or directory`, error: true };
    return { output: content };
}

function handleEcho(fullCommand: string): CommandOutput {
    const parts = fullCommand.split(' > ');
    if (parts.length !== 2) return { output: 'echo: syntax error', error: true };
    
    const message = parts[0].substring(5).trim().replace(/^"|"$/g, '');
    const targetPath = parts[1].trim();
    
    if (Array.isArray(appState.vfsBlob[targetPath])) {
        (appState.vfsBlob[targetPath] as any[]).push(message);
        return { output: `→ Whisper written to ${targetPath}` };
    } else {
        saveFileToVFS(targetPath, message);
        renderFileTree(); 
        renderEditorTab();
        renderAssetManager();
        return { output: `→ Data written to ${targetPath}` };
    }
}

export async function processVfsShellCommand(command: string): Promise<CommandOutput> {
    const tokens = command.trim().split(/\s+/);
    const op = tokens[0];
    
    switch(op) {
        case 'ls':
            return handleLs(tokens[1]);
        case 'cat':
            return await handleCat(tokens[1]);
        case 'echo':
            return handleEcho(command);
        case 'state':
            return await handleCat('/proc/SYSTEM_STATE_VECTOR');
        case 'vi':
            if (!tokens[1]) {
                return { output: 'vi: filename missing', error: true };
            }
            return await enterViMode(tokens[1]);
        case 'clear':
            if (dom.vfsShellOutput) dom.vfsShellOutput.innerHTML = '';
            return { output: '' };
        case 'help':
            const helpText = [
                'LIA Virtual Shell Commands:',
                '  `ls [path]`       - List files and directories. e.g., `ls /boot`',
                '  `cat <file>`      - Display file content. e.g., `cat /etc/lia_kernel.conf`',
                '  `echo "..." > <file>` - Write text to a file. Overwrites existing files.',
                '  `vi <file>`       - Edit or create a file. Use Ctrl+S to save/exit, Ctrl+Q to quit.',
                '  `state`           - Display the current system state vector.',
                '  `clear`           - Clear the terminal screen.',
                '  `help`            - Show this help message.',
                '\n  Navigation uses standard Linux-like paths. All paths are absolute from /.'
            ].join('\n');
            return { output: helpText };
        case '':
            return { output: '' };
        default:
            return { output: `Unknown command: ${op}. Type 'help' for a list of commands.`, error: true };
    }
}