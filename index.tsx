/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "https://esm.run/@google/genai";
import { appState } from './src/state';
import * as dom from './src/dom';
import { loadState, logPersistence, renderAssetManager } from './src/persistence';
import { renderAllChatMessages, renderFileTree, switchTab, renderCaraHud, renderKernelHud, renderMetisHud } from './src/ui';
import { switchFile } from './src/vfs';
import { initializeCommands, initializeEventListeners } from './src/events';
import { setAiInstance } from './src/services';
import { debugLog } from "./src/utils";

async function main() {
    debugLog('main() started.');
    logPersistence("Initializing LIA Studio...");
    if (!process.env.API_KEY) {
        document.body.innerHTML = '<h1>Missing API Key</h1><p>Please set the API_KEY environment variable.</p>';
        logPersistence("CRITICAL: Missing API Key.");
        console.error('CRITICAL: Missing API_KEY. Application halted.');
        return;
    }
    debugLog('API_KEY found.');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    setAiInstance(ai);
    debugLog('Gemini AI instance created.');

    initializeEventListeners();
    debugLog('Event listeners initialized.');
    await loadState();
    debugLog('State loaded from persistence.');
    
    // Handle tab ID migration for old saved states
    if (appState.currentActiveTabId === 'cara-assistor-tab') {
        appState.currentActiveTabId = 'assistor-tab';
        debugLog('Migrated cara-assistor-tab to assistor-tab.');
    }

    initializeCommands();
    debugLog('Commands initialized.');

    logPersistence("State loaded. Rendering UI...");
    debugLog('Applying saved AI settings to UI controls.');
    
    // Apply AI settings to UI controls
    if (dom.aiSettingsControls.model) dom.aiSettingsControls.model.value = appState.aiSettings.model;
    if (dom.aiSettingsControls.temperatureSlider) dom.aiSettingsControls.temperatureSlider.value = String(appState.aiSettings.temperature);
    if (dom.aiSettingsControls.temperatureInput) dom.aiSettingsControls.temperatureInput.value = String(appState.aiSettings.temperature);
    if (dom.aiSettingsControls.maxTokensSlider) dom.aiSettingsControls.maxTokensSlider.value = String(appState.aiSettings.maxOutputTokens);
    if (dom.aiSettingsControls.maxTokensInput) dom.aiSettingsControls.maxTokensInput.value = String(appState.aiSettings.maxOutputTokens);
    if (dom.aiSettingsControls.topPSlider) dom.aiSettingsControls.topPSlider.value = String(appState.aiSettings.topP);
    if (dom.aiSettingsControls.topPInput) dom.aiSettingsControls.topPInput.value = String(appState.aiSettings.topP);
    if (dom.aiSettingsControls.topKSlider) dom.aiSettingsControls.topKSlider.value = String(appState.aiSettings.topK);
    if (dom.aiSettingsControls.topKInput) dom.aiSettingsControls.topKInput.value = String(appState.aiSettings.topK);
    if (dom.caraBootstrapSelect) dom.caraBootstrapSelect.value = appState.caraState.activeBootstrapFile;
    if (dom.editorPaneTextarea) dom.editorPaneTextarea.value = appState.editorContent;

    dom.settingsGroupHeaders.forEach(header => {
        const group = header.dataset.group;
        if(group && appState.aiSettings.expandedGroups[group]) {
            header.classList.add('expanded');
            header.nextElementSibling?.classList.add('expanded');
        }
    });

    debugLog('Initial UI rendering pass starting...');
    renderAllChatMessages();
    renderFileTree();
    renderAssetManager();
    renderCaraHud();
    renderKernelHud();
    renderMetisHud();
    debugLog('Initial UI rendering pass finished.');
    
    debugLog(`Switching to initial file: "${appState.activeFilePath || '/0index.html'}".`);
    await switchFile(appState.activeFilePath || '/0index.html');
    debugLog(`Switching to initial tab: "${appState.currentActiveTabId}".`);
    await switchTab(appState.currentActiveTabId);
    
    // Collapse sidebars on startup as requested
    debugLog('Collapsing sidebars on startup.');
    dom.leftSidebar?.classList.add('collapsed');
    dom.rightSidebar?.classList.add('collapsed');

    logPersistence("Initialization complete.");
    debugLog('main() finished successfully.');
}

main().catch((err: any) => {
    const error = err || new Error("An unknown error occurred");
    console.error("Critical application error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logPersistence(`CRITICAL ERROR: ${errorMessage}`);
    document.body.innerHTML = `<h1>A critical error occurred.</h1><p>Please check the console for details. Error: ${errorMessage}</p>`;
});