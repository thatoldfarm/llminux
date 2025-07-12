
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { appState } from './state';
import { FileBlob } from './types';
import { generateIndexHtmlContent, getMimeType } from './utils';
import { renderFileTree, switchTab, renderEditorTab } from './ui';
import { renderAssetManager } from './persistence';
import * as dom from './dom';

export const getFileContent = (name: string) => appState.vfsFiles.find(f => f.name === name)?.content;
export const getActiveFile = () => appState.activeFile;

export async function switchFile(name: string) {
    const newActive = appState.vfsFiles.find(f => f.name === name);
    if (!newActive) return;

    appState.activeFile = newActive;

    if (newActive.type === 'text/html' && newActive.name === "0index.html") {
        if (dom.codeEditor) dom.codeEditor.style.display = 'none';
        if (dom.codePreview) {
            dom.codePreview.style.display = 'block';
            dom.codePreview.src = newActive.url;
        }
    } else {
        if (dom.codeEditor) {
            dom.codeEditor.style.display = 'block';
            dom.codeEditor.value = newActive.content;
        }
        if (dom.codePreview) dom.codePreview.style.display = 'none';
    }
    
    renderFileTree();
    await switchTab('code-editor-tab');
}

export function updateActiveFileContent(newContent: string) {
    if (appState.activeFile) {
        appState.activeFile.content = newContent;
    }
}

export function updateAndSaveVFS(newFiles: FileBlob[]) {
    const indexContent = generateIndexHtmlContent(newFiles);
    let indexFile = newFiles.find(f => f.name === '0index.html');
    
    const indexMimeType = 'text/html';
    const indexBlob = new Blob([indexContent], { type: indexMimeType });
    const indexUrl = URL.createObjectURL(indexBlob);

    if (indexFile) {
        URL.revokeObjectURL(indexFile.url); 
        indexFile.raw = indexBlob;
        indexFile.url = indexUrl;
        indexFile.size = indexBlob.size;
        indexFile.content = indexContent;
    } else {
        indexFile = {
            name: '0index.html',
            content: indexContent,
            raw: indexBlob,
            url: indexUrl,
            type: indexMimeType,
            size: indexBlob.size
        };
        newFiles.push(indexFile);
    }
    
    appState.vfsFiles = newFiles.sort((a, b) => a.name.localeCompare(b.name));

    renderFileTree();
    renderAssetManager();
    renderEditorTab();
}