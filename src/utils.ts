/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

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