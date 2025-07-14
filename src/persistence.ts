/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { appState, LIA_BOOTSTRAP_FILENAME, LIA_UTILITIES_FILENAME, protocolConfigs, LIA_LINUX_COMMANDS_FILENAME, CARA_BOOTSTRAP_FILENAME, CARA_SYSTEM_PROMPT_FILENAME, KINKSCAPE_FILENAMES, CARA_BOOTSTRAP_V2_FILENAME, LIA_COMMAND_LEGEND_FILENAME, METIS_BOOTSTRAP_FILENAME, METIS_SYSTEM_PROMPT_FILENAME, PUPA_SYSTEM_PROMPT_FILENAME } from './state';
import { AppState, LiaState, MetisState, VFSBlob } from './types';
import { getMimeType, blobToBase64, base64ToBlob } from './utils';
import { renderAllChatMessages, renderFileTree, switchTab, renderCaraHud, renderKernelHud, renderMetisHud } from './ui';
import { resetLiaState, getAllStatesFromBootstrap } from './services';
import { switchFile, getFileContentAsText, saveFileToVFS, getFileContentAsBlob } from './vfs';
import * as dom from './dom';

export function logPersistence(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    appState.persistenceLog.push(`[${timestamp}] ${message}`);
    if (appState.persistenceLog.length > 100) {
        appState.persistenceLog.shift();
    }
    if (appState.currentActiveTabId === 'log-tab') {
        renderPersistenceLog();
    }
}

export function renderPersistenceLog() {
    if (dom.persistenceLogEl) {
        dom.persistenceLogEl.innerHTML = appState.persistenceLog.join('\n');
        dom.persistenceLogEl.scrollTop = dom.persistenceLogEl.scrollHeight;
    }
}

export function handleClearLog() {
    appState.persistenceLog = [];
    logPersistence('Log cleared.');
}

export function renderAssetManager() {
    if (!dom.assetListContainer) return;

    dom.assetListContainer.innerHTML = '';
    const paths = Object.keys(appState.vfsBlob).sort();

    paths.forEach(path => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        const blob = getFileContentAsBlob(path);
        const url = blob instanceof Blob ? URL.createObjectURL(blob) : '#';

        item.innerHTML = `
            <span>${path}</span>
            <button class="download-asset-button" data-url="${url}" data-name="${path}">Download</button>
        `;
        dom.assetListContainer!.appendChild(item);
    });
}

async function getSerializableVfsBlob(): Promise<Record<string, any>> {
    const serializableBlob: Record<string, any> = {};
    for (const path in appState.vfsBlob) {
        const content = appState.vfsBlob[path];
        if (content instanceof Blob) {
            serializableBlob[path] = {
                __isBlob: true,
                type: content.type,
                content: await blobToBase64(content)
            };
        } else {
            serializableBlob[path] = content;
        }
    }
    return serializableBlob;
}

export async function getSerializableStateObject() {
    return {
        vfsBlob: await getSerializableVfsBlob(),
        liaState: appState.liaState,
        caraState: appState.caraState,
        metisState: appState.metisState,
        liaKernelChatHistory: appState.liaKernelChatHistory,
        fsUtilChatHistory: appState.fsUtilChatHistory,
        liaAssistantChatHistory: appState.liaAssistantChatHistory,
        codeAssistantChatHistory: appState.codeAssistantChatHistory,
        caraChatHistory: appState.caraChatHistory,
        metisChatHistory: appState.metisChatHistory,
        pupaMonologueHistory: appState.pupaMonologueHistory,
        aiSettings: appState.aiSettings,
        currentActiveTabId: appState.currentActiveTabId,
        activeFilePath: appState.activeFilePath,
        strictChatHistory: appState.strictChatHistory,
        roboChatHistory: appState.roboChatHistory,
        cloneChatHistory: appState.cloneChatHistory,
        aifseChatHistory: appState.aifseChatHistory,
        helpChatHistory: appState.helpChatHistory,
        omniChatHistory: appState.omniChatHistory,
        mcpChatHistory: appState.mcpChatHistory,
        cyberChatHistory: appState.cyberChatHistory,
        editorContent: appState.editorContent,
        lastUserAction: appState.lastUserAction,
        kernelHudVisible: appState.kernelHudVisible,
        metisHudVisible: appState.metisHudVisible,
    };
}

export async function getSerializableState(): Promise<string> {
    const stateObject = await getSerializableStateObject();
    return JSON.stringify(stateObject, null, 2);
}

export async function loadFromSerialized(jsonString: string) {
    const loadedData = JSON.parse(jsonString);

    // Reconstruct vfsBlob
    appState.vfsBlob = {};
    const loadedVfs = loadedData.vfsBlob || {};
    for (const path in loadedVfs) {
        const fileData = loadedVfs[path];
        if (fileData && fileData.__isBlob) {
            appState.vfsBlob[path] = await base64ToBlob(fileData.content, fileData.type);
        } else {
            appState.vfsBlob[path] = fileData;
        }
    }
    
    // Create a default state to merge with, ensuring all keys from the current bootstrap are present.
    const defaultLiaState: LiaState = {};
    const allStates = await getAllStatesFromBootstrap();
    if (allStates.length > 0) {
        allStates.forEach(state => {
            defaultLiaState[state.id] = state.value_initial;
        });
    }

    // Merge the loaded state over the default state. This adds new keys from the bootstrap
    // and overwrites default values with saved values if they exist.
    appState.liaState = { ...defaultLiaState, ...(loadedData.liaState || {}) };

    // Ensure all keys are present in caraState when loading
    const defaultCaraState = JSON.parse(JSON.stringify(appState.caraState)); // deep copy
    appState.caraState = { ...defaultCaraState, ...(loadedData.caraState || {}) };

    // Load Metis State
    const defaultMetisState = appState.metisState;
    appState.metisState = { ...defaultMetisState, ...(loadedData.metisState || {}) };

    // After loading states, ensure Cara's base metrics are synchronized
    // with the primary LIA kernel metrics to ensure HUD consistency on load.
    if (appState.liaState) {
        for (const key in appState.liaState) {
            if (Object.prototype.hasOwnProperty.call(appState.liaState, key) && key in appState.caraState) {
                 (appState.caraState as any)[key] = appState.liaState[key];
            }
        }
    }

    appState.liaKernelChatHistory = loadedData.liaKernelChatHistory || [];
    appState.fsUtilChatHistory = loadedData.fsUtilChatHistory || [];
    appState.liaAssistantChatHistory = loadedData.liaAssistantChatHistory || [];
    appState.codeAssistantChatHistory = loadedData.codeAssistantChatHistory || [];
    appState.caraChatHistory = loadedData.caraChatHistory || appState.caraChatHistory;
    appState.metisChatHistory = loadedData.metisChatHistory || appState.metisChatHistory;
    appState.pupaMonologueHistory = loadedData.pupaMonologueHistory || appState.pupaMonologueHistory;
    appState.aiSettings = loadedData.aiSettings;
    appState.activeFilePath = loadedData.activeFilePath || '0index.html';
    appState.currentActiveTabId = loadedData.currentActiveTabId || 'lia-assistant-tab';
    
    appState.strictChatHistory = loadedData.strictChatHistory || appState.strictChatHistory;
    appState.roboChatHistory = loadedData.roboChatHistory || appState.roboChatHistory;
    appState.cloneChatHistory = loadedData.cloneChatHistory || appState.cloneChatHistory;
    appState.aifseChatHistory = loadedData.aifseChatHistory || appState.aifseChatHistory;
    appState.helpChatHistory = loadedData.helpChatHistory || appState.helpChatHistory;
    appState.omniChatHistory = loadedData.omniChatHistory || appState.omniChatHistory;
    appState.mcpChatHistory = loadedData.mcpChatHistory || appState.mcpChatHistory;
    appState.cyberChatHistory = loadedData.cyberChatHistory || appState.cyberChatHistory;
    appState.editorContent = loadedData.editorContent || '';
    appState.lastUserAction = loadedData.lastUserAction || '';
    appState.kernelHudVisible = loadedData.kernelHudVisible || false;
    appState.metisHudVisible = loadedData.metisHudVisible || false;

    const utilsFileContent = await getFileContentAsText(LIA_UTILITIES_FILENAME);
    if (utilsFileContent) {
        try {
            appState.liaUtilitiesConfig = JSON.parse(utilsFileContent);
        } catch(e) {
            console.error("Failed to parse utilities config from saved state:", e);
        }
    }

    const kinkscapeFileContents = await Promise.all(KINKSCAPE_FILENAMES.map(name => getFileContentAsText(name)));
    appState.caraState.kinkscapeData = kinkscapeFileContents.filter(Boolean).map(content => JSON.parse(content!));

    // Re-save to local storage to update it
    saveStateToLocalStorage();
}

export function saveStateToLocalStorage() {
    getSerializableState().then(serializableState => {
        localStorage.setItem('lia_studio_state', serializableState);
        logPersistence('Session saved to Browser Storage.');
    }).catch(e => {
        logPersistence(`Error saving to Browser Storage: ${(e as Error).message}`);
    });
}

export async function loadState(): Promise<void> {
    appState.isPersistenceLoading = true;
    const savedState = localStorage.getItem('lia_studio_state');
    if (savedState) {
        logPersistence('Found session in Browser Storage. Attempting to restore...');
        try {
            await loadFromSerialized(savedState);
            logPersistence('Session restored from Browser Storage.');
            appState.isPersistenceLoading = false;
            return;
        } catch (e) {
            console.error("Failed to load from localStorage, initializing fresh state.", e);
            logPersistence(`Error restoring session: ${(e as Error).message}. Initializing a new session.`);
            // Clear corrupted state
            localStorage.removeItem('lia_studio_state');
        }
    }

    logPersistence('No valid session found. Initializing a new session from default files...');
    
    // Clear any potentially lingering old state
    appState.vfsBlob = {};

    const systemFilesToFetch = [
        LIA_BOOTSTRAP_FILENAME,
        LIA_UTILITIES_FILENAME,
        CARA_BOOTSTRAP_FILENAME,
        CARA_SYSTEM_PROMPT_FILENAME,
        CARA_BOOTSTRAP_V2_FILENAME,
        '/bootstrap/kernel/LIA_MASTER_BOOTSTRAP_v7.1_Absolute_Kernel_Root_Edition_Refined.json',
        LIA_COMMAND_LEGEND_FILENAME,
        LIA_LINUX_COMMANDS_FILENAME,
        METIS_BOOTSTRAP_FILENAME,
        METIS_SYSTEM_PROMPT_FILENAME,
        PUPA_SYSTEM_PROMPT_FILENAME,
        ...Object.values(protocolConfigs).map(p => p.promptFile),
        ...KINKSCAPE_FILENAMES
    ];
    
    await Promise.all(
        [...new Set(systemFilesToFetch)].map(async (path) => {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const content = await response.text();
                saveFileToVFS(path, content);
            } catch (e) {
                logPersistence(`Error loading system file ${path}: ${(e as Error).message}`);
                console.error(`Failed to fetch ${path}`, e);
            }
        })
    );
    
    // Add initial shell files
    appState.vfsBlob['/etc/motd'] = 'Welcome to the LIA Virtual Shell.\n';
    
    // Add 0index.html which is now static
    const indexContent = await fetch('0index.html').then(res => {
        if (!res.ok) throw new Error(`Failed to fetch 0index.html: ${res.status}`);
        return res.text();
    });
    saveFileToVFS('0index.html', indexContent);

    const utilsContent = await getFileContentAsText(LIA_UTILITIES_FILENAME);
    if (utilsContent) {
        try {
            appState.liaUtilitiesConfig = JSON.parse(utilsContent);
            logPersistence(`Parsed ${LIA_UTILITIES_FILENAME}`);
        } catch (e) {
            logPersistence(`ERROR: Failed to parse ${LIA_UTILITIES_FILENAME}: ${(e as Error).message}`);
        }
    }
    
    const kinkscapeContents = await Promise.all(KINKSCAPE_FILENAMES.map(name => getFileContentAsText(name)));
    appState.caraState.kinkscapeData = kinkscapeContents
        .filter((content): content is string => !!content)
        .map(content => {
            try { return JSON.parse(content); } catch (e) {
                logPersistence(`ERROR: Failed to parse kinkscape file: ${(e as Error).message}`);
                return null;
            }
        }).filter(Boolean);

    await resetLiaState();

    appState.liaKernelChatHistory = [];
    appState.fsUtilChatHistory = [];
    appState.liaAssistantChatHistory = [];
    appState.codeAssistantChatHistory = [];
    appState.activeFilePath = '0index.html';
    appState.currentActiveTabId = 'lia-assistant-tab';
    
    appState.isPersistenceLoading = false;
    logPersistence("Default session initialized.");
}

export function handleDirectSave() {
    logPersistence('Saving session to Browser Storage...');
    saveStateToLocalStorage();
}

export async function handleDirectLoad() {
    logPersistence('Loading session from Browser Storage...');
    appState.isPersistenceLoading = true;
    await loadState();
    appState.isPersistenceLoading = false;

    await renderAllChatMessages();
    await renderFileTree();
    await renderAssetManager();
    await renderCaraHud();
    await renderKernelHud();
    await renderMetisHud();
    await switchFile(appState.activeFilePath || '0index.html');
    await switchTab(appState.currentActiveTabId);
}

export function handleClearAndReset() {
    if (confirm('Are you sure you want to clear all saved data and reset the application?')) {
        logPersistence('Clearing all data and resetting...');
        localStorage.removeItem('lia_studio_state');
        window.location.reload();
    }
}

export async function handleMetaExport() {
    logPersistence('Starting state export...');
    try {
        const content = await getSerializableState();
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dom.metaSaveNameInput?.value || 'lia-studio-save'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        logPersistence('State exported successfully.');
    } catch (e) {
        logPersistence(`Export failed: ${(e as Error).message}`);
    }
}

export async function handleExportManifest() {
    logPersistence('Exporting blob URL manifest...');
    try {
        const manifest: Record<string, string> = {};
        for(const path in appState.vfsBlob) {
            const blob = getFileContentAsBlob(path);
            if(blob instanceof Blob) {
                manifest[path] = URL.createObjectURL(blob);
            }
        }

        const content = JSON.stringify(manifest, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vfs_blob_url_manifest.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Note: URLs created here are temporary and will be revoked. This manifest is for immediate use.
        logPersistence('Manifest exported successfully.');
    } catch (e) {
        logPersistence(`Manifest export failed: ${(e as Error).message}`);
    }
}

export function handleMetaLoad(file: File) {
    logPersistence(`Importing state from "${file.name}"...`);
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const content = e.target?.result as string;
            await loadFromSerialized(content);
            logPersistence('State imported successfully. UI will now update.');
            await renderAllChatMessages();
            await renderFileTree();
            await renderAssetManager();
            await renderCaraHud();
            await renderKernelHud();
            await renderMetisHud();
            await switchFile(appState.activeFilePath || '0index.html');
            await switchTab(appState.currentActiveTabId);
        } catch (err) {
            logPersistence(`Import failed: ${(err as Error).message}`);
        }
    };
    reader.onerror = () => {
        logPersistence(`Failed to read file: ${reader.error}`);
    };
    reader.readAsText(file);
}