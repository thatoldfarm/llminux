/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { FileBlob } from './types';

export const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    switch (ext) {
        case 'html': return 'text/html';
        case 'css': return 'text/css';
        case 'js': return 'application/javascript';
        case 'json': return 'application/json';
        case 'md': case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
};

export function formatBytes(bytes: number, decimals = 2): string {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const generateIndexHtmlContent = (allFiles: FileBlob[]): string => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>LIA Studio - File Index</title>
  <style>
    :root { --bg-primary: #1e1e1e; --text-primary: #cccccc; --accent-color: #007acc; --border-color: #3f3f3f; }
    body { background-color: var(--bg-primary); color: var(--text-primary); font-family: monospace; padding: 2rem; }
    h1 { color: var(--accent-color); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 0.5rem 0; }
    a { color: var(--accent-color); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .file-meta { color: #888; font-size: 0.9em; margin-left: 1em;}
  </style>
</head>
<body>
  <h1>Virtual File System Index</h1>
  <div id="file-list-container">Loading...</div>
  <script>
    const container = document.getElementById('file-list-container');
    function renderFileList(files) {
        if (!files || files.length === 0) {
            container.innerHTML = '<p>No files found.</p>';
            return;
        }
        const listHtml = files.filter(f => f.name !== '0index.html').map(f => \`<li><a href="\${f.url}" target="_blank">\${f.name}</a><span class="file-meta">(\${f.type}, \${f.size})</span></li>\`).join('');
        container.innerHTML = \`<ul>\${listHtml}</ul>\`;
    }
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'LIA_STUDIO_FILE_LIST') {
            renderFileList(event.data.files);
        }
    });
    window.parent.postMessage({ type: 'LIA_STUDIO_REQUEST_FILES' }, '*');
  <\/script>
</body>
</html>`;
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const base64ToBlob = async (base64: string, type: string): Promise<Blob> => {
    const res = await fetch(`data:${type};base64,${base64}`);
    return await res.blob();
};

export function autoExpandTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

export function scrollToBottom(element: HTMLElement | null) {
    if (element) {
        // Use a small timeout to allow the browser to render the new content
        // and calculate the correct scrollHeight before scrolling.
        setTimeout(() => {
            element.scrollTop = element.scrollHeight;
        }, 0);
    }
}