
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "https://esm.run/@google/genai";
import { appState } from './src/state';
import * as dom from './src/dom';
import { loadState, logPersistence, renderAssetManager } from './src/persistence';
import { renderAllChatMessages, renderFileTree, switchTab } from './src/ui';
import { switchFile } from './src/vfs';
import { initializeCommands, initializeEventListeners } from './src/events';
import { setAiInstance } from './src/services';

async function main() {
    logPersistence("Initializing LIA Studio...");
    if (!process.env.API_KEY) {
        document.body.innerHTML = '<h1>Missing API Key</h1><p>Please set the API_KEY environment variable.</p>';
        logPersistence("CRITICAL: Missing API Key.");
        return;
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    setAiInstance(ai);

    initializeEventListeners();
    await loadState();
    initializeCommands();

    logPersistence("State loaded. Rendering UI...");
    
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
    dom.settingsGroupHeaders.forEach(header => {
        const group = header.dataset.group;
        if(group && appState.aiSettings.expandedGroups[group]) {
            header.classList.add('expanded');
            header.nextElementSibling?.classList.add('expanded');
        }
    });

    renderAllChatMessages();
    renderFileTree();
    renderAssetManager();
    await switchFile(appState.activeFile?.name || '0index.html');
    await switchTab(appState.currentActiveTabId);
    
    // Collapse sidebars on startup as requested
    dom.leftSidebar?.classList.add('collapsed');
    dom.rightSidebar?.classList.add('collapsed');

    logPersistence("Initialization complete.");
}

main().catch(e => {
    console.error("Critical application error:", e);
    logPersistence(`CRITICAL ERROR: ${e.message}`);
    document.body.innerHTML = '<h1>A critical error occurred. Please check the console.</h1>';
});