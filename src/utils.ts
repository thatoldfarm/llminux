/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { parse } from 'jsonc-parser';
import { appState } from './state';
import { VFSBlob } from './types';

export function debugLog(...data: any[]) {
    if (appState.debugMode) {
      console.log('[Debug]', ...data);
    }
}

export function parseJsonc(jsonString: string, filePathForError?: string): any {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            console.error(`[JSONC Parse] Invalid input for parsing. Expected string, got:`, typeof jsonString);
            if (filePathForError) {
                console.error(`File path: ${filePathForError}`);
            }
            return null;
        }
        // The jsonc-parser is more robust and can handle comments, trailing commas, etc.
        const errors: any[] = [];
        const result = parse(jsonString, errors);
        if (errors.length > 0) {
             console.warn(`[JSONC Parse] Encountered non-fatal errors parsing ${filePathForError || 'unknown source'}:`, errors);
        }
        return result;
    } catch (e) {
        const error = e as Error;
        console.error(`[JSONC Parse] CRITICAL: Error parsing JSONC from ${filePathForError || 'unknown source'}:`, error.message);
        return null;
    }
}


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

// Encodes ArrayBuffer to a URL-safe Base64 string
function bufferToUrlSafeBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    // The btoa function creates a standard Base64 string.
    // We then make it URL-safe by replacing '+' with '-', '/' with '_', and removing padding.
    return window.btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Converts a Blob to a URL-safe Base64 string
export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (reader.error) {
                return reject(reader.error);
            }
            // FileReader result is an ArrayBuffer, which we encode.
            resolve(bufferToUrlSafeBase64(reader.result as ArrayBuffer));
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(blob);
    });
};

// Converts a URL-safe Base64 string back to a Blob
export const base64ToBlob = async (base64: string, type: string): Promise<Blob> => {
    // Add padding back, and replace URL-safe characters with standard ones
    let standardBase64 = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (standardBase64.length % 4) {
        standardBase64 += '=';
    }
    
    // Use fetch for robust decoding, which handles Base64 data URLs natively.
    const res = await fetch(`data:${type};base64,${standardBase64}`);
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

export async function prepareVfsForPortal(vfsBlob: VFSBlob): Promise<VFSBlob> {
    debugLog('[prepareVfsForPortal] Starting conversion...');
    const portalVfs: VFSBlob = {};
    for (const path in vfsBlob) {
        const content = vfsBlob[path];
        if (content instanceof Blob) {
            // Only text-based files are needed for the portals' functionality
            if (content.type.startsWith('text/') || content.type.includes('json')) {
                try {
                    debugLog(`[prepareVfsForPortal] Converting Blob to text for: ${path}`);
                    portalVfs[path] = await content.text();
                } catch(e) {
                     console.error(`[prepareVfsForPortal] Error reading blob as text for ${path}:`, e);
                     portalVfs[path] = `[Error Reading Blob: ${content.type}]`;
                }
            } else {
                 debugLog(`[prepareVfsForPortal] Passing through binary Blob as placeholder for: ${path}`);
                portalVfs[path] = `[Binary Content: ${content.type}]`;
            }
        } else {
            debugLog(`[prepareVfsForPortal] Passing through non-blob content for: ${path}`);
            portalVfs[path] = content; // Keep strings or arrays as they are
        }
    }
    debugLog('[prepareVfsForPortal] Conversion complete.');
    return portalVfs;
}