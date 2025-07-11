
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { marked } from "https://esm.run/marked";
import DOMPurify from "https://esm.run/dompurify";

import { appState, protocolConfigs, LIA_COMMAND_LEGEND_FILENAME } from './state';
import { AppState, StateDefinition, ChatMessage, FileBlob, Command } from './types';
import * as dom from './dom';
import { getAllStatesFromBootstrap } from "./services";
import { handleProtocolSend } from "./services";
import { renderPersistenceLog, renderAssetManager } from "./persistence";
import { autoExpandTextarea, formatBytes } from "./utils";
import { getFileContent } from './vfs';
import { FOLDER_NAMES } from './state';

marked.use({
    highlight: (code, lang) => {
        const language = lang || 'plaintext';
        return `<pre><code class="language-${language}">${code}</code></pre>`;
    },
});

export function createChatBubble(role: 'user' | 'model' | 'error' | 'system', text: string, thinking = false): HTMLElement {
    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', `${role}-bubble`);

    const content = document.createElement('div');
    content.classList.add('chat-content');

    if (thinking) {
        bubble.classList.add('thinking');
        content.innerHTML = '<div class="dot-flashing"></div>';
    } else {
        const dirtyHtml = marked.parse(text || "...");
        const cleanHtml = DOMPurify.sanitize(dirtyHtml);
        content.innerHTML = cleanHtml;
    }

    bubble.appendChild(content);

    if (!thinking && text) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.title = 'Copy text';
        copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(text).then(() => {
                copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                setTimeout(() => {
                     copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                }, 2000);
            });
        });
        bubble.appendChild(copyButton);
    }

    return bubble;
}

export function renderSystemState(isDelta: boolean) {
    if (!dom.systemStatePane) return;

    try {
        const allStates: StateDefinition[] = getAllStatesFromBootstrap();
        if (!dom.systemStatePane.querySelector('#reset-state-button')) {
            dom.systemStatePane.innerHTML = `
                <div class="system-state-header">
                    <h2>LIA Kernel Metrics</h2>
                    <button id="reset-state-button" class="button-secondary">Reset State</button>
                </div>
                <h3 class="state-section-header">Quantitative Metrics</h3>
                <div id="system-state-grid" class="metric-grid"></div>
                <h3 class="state-section-header">Qualitative States</h3>
                <div id="qualitative-state-grid" class="qualitative-grid"></div>
            `;
        }
        const quantitativeGrid = dom.systemStatePane.querySelector('#system-state-grid');
        const qualitativeGrid = dom.systemStatePane.querySelector('#qualitative-state-grid');
        if (!quantitativeGrid || !qualitativeGrid) return;

        quantitativeGrid.innerHTML = '';
        qualitativeGrid.innerHTML = '';

        allStates.forEach(state => {
            const value = appState.liaState[state.id];
            if (value === undefined) return;

            const stateEl = document.createElement('div');
           
            if ('range' in state && state.range) { // It's a metric with a range
                stateEl.className = 'state-metric';
                const lastValue = stateEl.dataset.lastValue;
                if (isDelta && lastValue && lastValue !== String(value)) {
                    stateEl.classList.add('changed');
                    setTimeout(() => stateEl.classList.remove('changed'), 1500);
                }
                stateEl.dataset.lastValue = String(value);

                const numericValue = Number(value);
                const rangeDiff = state.range[1] - state.range[0];
                let percentage = 0;
                if (rangeDiff > 0 && !isNaN(numericValue)) {
                    percentage = ((numericValue - state.range[0]) / rangeDiff) * 100;
                }
                
                stateEl.innerHTML = `
                    <div class="metric-info">
                        <strong title="${state.description}">${state.name}</strong>
                        <span>${typeof value === 'number' ? value.toFixed(3) : value}</span>
                    </div>
                    <div class="metric-bar-container">
                        <div class="metric-bar" style="width: ${Math.max(0, Math.min(100, percentage))}%;"></div>
                    </div>
                `;
                quantitativeGrid.appendChild(stateEl);
            } else { // It's a qualitative state
                 stateEl.className = 'qualitative-item';
                 stateEl.innerHTML = `
                    <div class="metric-info">
                        <strong title="${state.description}">${state.name}</strong>
                    </div>
                    <span class="qualitative-value">${Array.isArray(value) ? value.join(', ') : value}</span>
                `;
                qualitativeGrid.appendChild(stateEl);
            }
        });
    } catch (e) {
        console.error("Error rendering system state:", e);
        if (dom.systemStatePane) {
            dom.systemStatePane.innerHTML = `<div class="error-bubble">A critical error occurred while rendering kernel metrics. Check console for details.</div>`;
        }
    }
}

export function renderToolsTab() {
    if (!dom.toolsPane) return;

    const protocol = appState.activeToolProtocol;
    const config = protocolConfigs[protocol];

    dom.toolsPane.innerHTML = `
        <div class="tools-tab-wrapper">
            <nav class="tools-console-sidebar">
                <h2>Protocols</h2>
                <ul id="protocol-list" class="protocol-list"></ul>
            </nav>
            <main class="tools-console-main">
                <div class="protocol-interface-container">
                    <div class="chat-header">
                        <h2>${config.name}</h2>
                        ${config.operators.length > 0 ? `
                        <div class="operator-group">
                            <label for="protocol-operator-select">Operator:</label>
                            <select id="protocol-operator-select" class="custom-select">
                                ${config.operators.map(op => `<option value="${op}">${op}</option>`).join('')}
                            </select>
                        </div>
                        ` : ''}
                    </div>
                    <div id="protocol-chat-messages" class="chat-messages"></div>
                    <div class="chat-input-container">
                        <textarea id="protocol-chat-input" placeholder="Issue command to ${config.name}..." rows="1"></textarea>
                        <button id="send-protocol-chat-button" title="Send (Ctrl+Enter)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"></path></svg>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    `;

    const protocolList = document.getElementById('protocol-list');
    if (protocolList) {
        Object.keys(protocolConfigs).forEach(pKey => {
            const p = pKey as keyof typeof protocolConfigs;
            const li = document.createElement('li');
            li.className = 'protocol-item' + (p === protocol ? ' active' : '');
            li.textContent = protocolConfigs[p].name;
            li.dataset.protocol = p;
            protocolList.appendChild(li);
        });
    }

    const messagesEl = document.getElementById('protocol-chat-messages');
    if (messagesEl) {
        messagesEl.innerHTML = '';
        const historyKey = `${protocol}ChatHistory` as keyof AppState;
        (appState[historyKey] as ChatMessage[]).forEach(msg => {
            messagesEl.appendChild(createChatBubble(msg.role, msg.parts[0].text));
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
}

function renderLiaCommandResults(filteredCommands: any[]) {
    const resultsContainer = document.getElementById('lia-command-search-results');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (filteredCommands.length === 0) {
        resultsContainer.innerHTML = '<div class="lia-command-item"><p>No LIA commands found.</p></div>';
        return;
    }
    
    filteredCommands.forEach(cmd => {
        const item = document.createElement('div');
        item.className = 'lia-command-item';
        item.innerHTML = `
            <strong>${cmd.name}</strong> <code>(sig: ${cmd.sig})</code>
            <p>${cmd.desc}</p>
        `;
        resultsContainer.appendChild(item);
    });
}

export function renderUiCommandResults(commands: Command[]) {
    const resultsContainer = document.getElementById('ui-command-search-results');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    if (commands.length === 0) {
        resultsContainer.innerHTML = '<div class="ui-command-item">No UI commands found.</div>';
        return;
    }
    
    let currentSection = '';
    commands.forEach(cmd => {
        if (cmd.section !== currentSection) {
            currentSection = cmd.section;
            const header = document.createElement('div');
            header.className = 'command-palette-section-header'; // Re-use style
            header.textContent = currentSection;
            resultsContainer.appendChild(header);
        }
        const item = document.createElement('div');
        item.className = 'ui-command-item';
        item.textContent = cmd.name;
        item.dataset.commandId = cmd.id;
        resultsContainer.appendChild(item);
    });
}

function renderSearchTab() {
    if (!dom.searchTabPane) return;

    dom.searchTabPane.innerHTML = `
        <div id="search-tab-content">
            <div class="search-section">
                <h3>UI & System Commands</h3>
                <input type="text" id="ui-command-search-input" class="command-input-field" placeholder="Search UI commands (Ctrl+K)...">
                <div id="ui-command-search-results"></div>
            </div>
            <div class="search-section">
                <h3>LIA Kernel/Utility Commands</h3>
                <input type="text" id="lia-command-search-input" class="command-input-field" placeholder="Filter LIA commands...">
                <div id="lia-command-search-results"></div>
            </div>
        </div>
    `;
    
    renderUiCommandResults(appState.commandPaletteCommands);
    
    if (appState.liaCommandList.length === 0) {
        const legendContent = getFileContent(LIA_COMMAND_LEGEND_FILENAME);
        if (legendContent) {
            try {
                const legend = JSON.parse(legendContent);
                appState.liaCommandList = legend.categories.flatMap((cat: any) => cat.items || []);
            } catch (e) {
                console.error("Failed to parse LIA command legend:", e);
                appState.liaCommandList = [{name: 'Error', sig: 'err', desc: 'Could not load command list.'}];
            }
        }
    }
    renderLiaCommandResults(appState.liaCommandList);
}

export function renderFileTree() {
    if (!dom.fileTree) return;
    dom.fileTree.innerHTML = '';

    const rootFiles = appState.vfsFiles.filter(f => !FOLDER_NAMES.some(folder => f.name.startsWith(folder + '/')));
    rootFiles.forEach(file => dom.fileTree!.appendChild(createFileElement(file)));

    FOLDER_NAMES.forEach(folderName => {
        const folderFiles = appState.vfsFiles.filter(f => f.name.startsWith(folderName + '/'));
        if (folderFiles.length > 0) {
            const isExpanded = appState.aiSettings.expandedFolders[folderName];
            const folderHeader = document.createElement('div');
            folderHeader.className = `folder-header ${isExpanded ? 'expanded' : ''}`;
            folderHeader.innerHTML = `<span class="folder-toggle">▶</span> ${folderName}`;

            const folderContent = document.createElement('div');
            folderContent.className = `folder-content ${isExpanded ? '' : 'collapsed'}`;
            folderFiles.forEach(file => folderContent.appendChild(createFileElement(file, folderName)));

            folderHeader.addEventListener('click', () => {
                appState.aiSettings.expandedFolders[folderName] = !appState.aiSettings.expandedFolders[folderName];
                folderHeader.classList.toggle('expanded');
                folderContent.classList.toggle('collapsed');
            });

            dom.fileTree!.appendChild(folderHeader);
            dom.fileTree!.appendChild(folderContent);
        }
    });
}

function createFileElement(file: FileBlob, folderName?: string): HTMLElement {
    const el = document.createElement('div');
    const isActive = appState.activeFile?.name === file.name;
    el.className = 'file-item' + (isActive ? ' active' : '');
    el.dataset.fileName = file.name;
    if (file.name === '0index.html') {
      el.classList.add('index-html-file');
    }
    
    const fileNameDisplay = folderName ? file.name.substring(folderName.length + 1) : file.name;

    el.innerHTML = `
        <div class="file-item-name" title="${file.name}">${fileNameDisplay}</div>
        <div class="file-meta">
            <span class="file-size">${formatBytes(file.size)}</span>
            <div class="file-actions">
                <button class="file-action-button" data-action="copy-content" title="Copy Content">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button class="file-action-button" data-action="copy-url" title="Copy Blob URL">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
                </button>
                <button class="file-action-button" data-action="open-tab" title="Open in New Tab">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                </button>
            </div>
        </div>
    `;

    return el;
}

export async function switchTab(tabId: string) {
    if (appState.isSwitchingTabs || appState.currentActiveTabId === tabId) return;
    appState.isSwitchingTabs = true;

    try {
        document.querySelectorAll('.tab-button.active, .tab-pane.active').forEach(el => {
            el.classList.remove('active');
        });

        document.querySelector(`.tab-button[data-tab-id="${tabId}"]`)?.classList.add('active');
        document.getElementById(tabId)?.classList.add('active');

        appState.currentActiveTabId = tabId;
        renderActiveTabContent();
    } catch(e) {
        console.error(`Failed to switch to tab ${tabId}:`, e);
    }
    finally {
        appState.isSwitchingTabs = false;
    }
}

function renderActiveTabContent() {
    switch(appState.currentActiveTabId) {
        case 'system-state-tab':
            renderSystemState(false);
            break;
        case 'persist-tab':
            renderAssetManager();
            break;
        case 'tools-tab':
            renderToolsTab();
            break;
        case 'log-tab':
            renderPersistenceLog();
            break;
        case 'search-tab':
            renderSearchTab();
            break;
    }
}

export function renderAllChatMessages() {
    if (dom.liaKernelMessages) {
        dom.liaKernelMessages.innerHTML = '';
        appState.liaKernelChatHistory.forEach(msg => dom.liaKernelMessages!.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
    }
    if (dom.fsUtilMessages) {
        dom.fsUtilMessages.innerHTML = '';
        appState.fsUtilChatHistory.forEach(msg => dom.fsUtilMessages!.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
    }
    if (dom.liaAssistantMessages) {
        dom.liaAssistantMessages.innerHTML = '';
        appState.liaAssistantChatHistory.forEach(msg => dom.liaAssistantMessages!.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
    }
    if (dom.codeAssistantMessages) {
        dom.codeAssistantMessages.innerHTML = '';
        appState.codeAssistantChatHistory.forEach(msg => dom.codeAssistantMessages!.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
    }
    if (dom.vanillaMessages) {
        dom.vanillaMessages.innerHTML = '';
        appState.vanillaChatHistory.forEach(msg => dom.vanillaMessages!.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
    }
}