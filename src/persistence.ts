

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { appState, defaultVfsFiles, LIA_BOOTSTRAP_FILENAME, LIA_UTILITIES_FILENAME, protocolConfigs, LIA_LINUX_COMMANDS_FILENAME, CARA_BOOTSTRAP_FILENAME, CARA_SYSTEM_PROMPT_FILENAME, KINKSCAPE_FILENAMES, CARA_BOOTSTRAP_V2_FILENAME, LIA_COMMAND_LEGEND_FILENAME, METIS_BOOTSTRAP_FILENAME } from './state';
import { AppState, DefaultFile, FileBlob, LiaState, MetisState } from './types';
import { getMimeType, generateIndexHtmlContent } from './utils';
import { renderAllChatMessages, renderFileTree, switchTab, renderCaraHud, renderKernelHud, renderMetisHud } from './ui';
import { resetLiaState, getAllStatesFromBootstrap } from './services';
import { switchFile, getFileContent } from './vfs';
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

    appState.vfsFiles.forEach(file => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.innerHTML = `
            <span>${file.name}</span>
            <button class="download-asset-button" data-url="${file.url}" data-name="${file.name}">Download</button>
        `;
        dom.assetListContainer.appendChild(item);
    });
}

export function getSerializableStateObject() {
     const serializableFiles = appState.vfsFiles
        .filter(file => file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('javascript') || file.name.endsWith('.md'))
        .map(file => ({
            name: file.name,
            content: file.content,
        }));
    
    return {
        vfs: serializableFiles,
        liaState: appState.liaState,
        caraState: appState.caraState,
        metisState: appState.metisState,
        liaKernelChatHistory: appState.liaKernelChatHistory,
        fsUtilChatHistory: appState.fsUtilChatHistory,
        liaAssistantChatHistory: appState.liaAssistantChatHistory,
        codeAssistantChatHistory: appState.codeAssistantChatHistory,
        caraChatHistory: appState.caraChatHistory,
        metisChatHistory: appState.metisChatHistory,
        aiSettings: appState.aiSettings,
        currentActiveTabId: appState.currentActiveTabId,
        activeFileName: appState.activeFile?.name || null,
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
    const stateObject = getSerializableStateObject();
    return JSON.stringify(stateObject, null, 2);
}

export async function loadFromSerialized(jsonString: string) {
    const loadedData = JSON.parse(jsonString);

    appState.vfsFiles.forEach(file => {
        if(file.url) URL.revokeObjectURL(file.url);
    });

    const loadedFiles: DefaultFile[] = loadedData.vfs;
    const vfsFiles = await Promise.all(
        loadedFiles.map(async (file) => {
            const type = getMimeType(file.name);
            const blob = new Blob([file.content], { type });
            const url = URL.createObjectURL(blob);
            return { ...file, raw: blob, url, type, size: blob.size };
        })
    );
    appState.vfsFiles = vfsFiles;

    const indexContent = generateIndexHtmlContent(appState.vfsFiles);
    let indexFile = appState.vfsFiles.find(f => f.name === '0index.html');
    const indexMimeType = 'text/html';
    const indexBlob = new Blob([indexContent], { type: indexMimeType });
    const indexUrl = URL.createObjectURL(indexBlob);
    if (indexFile) {
        if(indexFile.url) URL.revokeObjectURL(indexFile.url);
        indexFile.raw = indexBlob;
        indexFile.url = indexUrl;
        indexFile.size = indexBlob.size;
        indexFile.content = indexContent;
    } else {
        appState.vfsFiles.push({ name: '0index.html', content: indexContent, raw: indexBlob, url: indexUrl, type: indexMimeType, size: indexBlob.size });
    }
    appState.vfsFiles.sort((a, b) => a.name.localeCompare(b.name));

    // Create a default state to merge with, ensuring all keys from the current bootstrap are present.
    const defaultLiaState: LiaState = {};
    const allStates = getAllStatesFromBootstrap();
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
    appState.aiSettings = loadedData.aiSettings;
    appState.activeFile = appState.vfsFiles.find(f => f.name === loadedData.activeFileName) || appState.vfsFiles.find(f => f.name === '0index.html') || null;
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

    const utilsFile = getFileContent(LIA_UTILITIES_FILENAME);
    if (utilsFile) {
        try {
            appState.liaUtilitiesConfig = JSON.parse(utilsFile);
        } catch(e) {
            console.error("Failed to parse utilities config from saved state:", e);
        }
    }
    const kinkscapeFiles = KINKSCAPE_FILENAMES.map(name => getFileContent(name)).filter(Boolean);
    appState.caraState.kinkscapeData = kinkscapeFiles.map(content => JSON.parse(content));
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
        }
    }

    logPersistence('No valid session found. Initializing a new session from default files...');
    
    let processedFiles: FileBlob[] = await Promise.all(
        defaultVfsFiles.map(async (file) => {
            const type = getMimeType(file.name);
            const blob = new Blob([file.content], { type });
            const url = URL.createObjectURL(blob);
            return { ...file, raw: blob, url, type, size: blob.size };
        })
    );

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
        ...Object.values(protocolConfigs).map(p => p.promptFile),
        ...KINKSCAPE_FILENAMES
    ];
    
    const fetchedBlobs = await Promise.all(
        [...new Set(systemFilesToFetch)].map(async (path) => {
            try {
                const response = await fetch(path);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const content = await response.text();
                const type = getMimeType(path);
                const blob = new Blob([content], { type });
                const url = URL.createObjectURL(blob);

                if (path === LIA_UTILITIES_FILENAME) {
                    try {
                        appState.liaUtilitiesConfig = JSON.parse(content);
                        logPersistence(`Parsed ${LIA_UTILITIES_FILENAME}`);
                    } catch (parseError) {
                        logPersistence(`ERROR: Failed to parse ${LIA_UTILITIES_FILENAME}: ${(parseError as Error).message}`);
                    }
                }
                
                if (KINKSCAPE_FILENAMES.includes(path)) {
                    try {
                         appState.caraState.kinkscapeData.push(JSON.parse(content));
                    } catch (parseError) {
                        logPersistence(`ERROR: Failed to parse ${path}: ${(parseError as Error).message}`);
                    }
                }

                if (path === METIS_BOOTSTRAP_FILENAME) {
                    try {
                        const metisBootstrap = JSON.parse(content);
                        appState.metisState = metisBootstrap.INITIAL_METIS_STATE;
                        logPersistence(`Parsed ${METIS_BOOTSTRAP_FILENAME}`);
                    } catch (parseError) {
                        logPersistence(`ERROR: Failed to parse ${METIS_BOOTSTRAP_FILENAME}: ${(parseError as Error).message}`);
                    }
                }

                return { name: path, content, raw: blob, url, type, size: blob.size };
            } catch (e) {
                logPersistence(`Error loading system file ${path}: ${(e as Error).message}`);
                console.error(`Failed to fetch ${path}`, e);
                return null;
            }
        })
    );
    
    processedFiles.push(...fetchedBlobs.filter((blob): blob is FileBlob => blob !== null));
    appState.vfsFiles = processedFiles;

    const indexContent = generateIndexHtmlContent(appState.vfsFiles);
    const indexMimeType = 'text/html';
    const indexBlob = new Blob([indexContent], { type: indexMimeType });
    appState.vfsFiles.push({
        name: '0index.html',
        content: indexContent,
        raw: indexBlob,
        url: URL.createObjectURL(indexBlob),
        type: indexMimeType,
        size: indexBlob.size
    });
    appState.vfsFiles.sort((a, b) => a.name.localeCompare(b.name));

    resetLiaState();

    appState.liaKernelChatHistory = [];
    appState.fsUtilChatHistory = [];
    appState.liaAssistantChatHistory = [];
    appState.codeAssistantChatHistory = [];
    appState.activeFile = appState.vfsFiles.find(f => f.name === '0index.html') || null;
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

    renderAllChatMessages();
    renderFileTree();
    renderAssetManager();
    renderCaraHud();
    renderKernelHud();
    renderMetisHud();
    await switchFile(appState.activeFile?.name || '0index.html');
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
        const manifest = appState.vfsFiles.reduce((acc, file) => {
            acc[file.name] = file.url;
            return acc;
        }, {} as Record<string, string>);

        const content = JSON.stringify(manifest, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vfs_blob_url_manifest.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
            renderAllChatMessages();
            renderFileTree();
            renderAssetManager();
            renderCaraHud();
            renderKernelHud();
            renderMetisHud();
            await switchFile(appState.activeFile?.name || '0index.html');
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
