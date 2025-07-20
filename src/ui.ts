/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { marked } from "https://esm.run/marked";
import DOMPurify from "https://esm.run/dompurify";

import { appState, protocolConfigs, LIA_COMMAND_LEGEND_FILENAME, LIA_LINUX_COMMANDS_FILENAME, LIA_BOOTSTRAP_FILENAME, LIA_UTILITIES_FILENAME } from './state';
import { AppState, StateDefinition, ChatMessage, Command, Protocol, LiaUtilityDefinition, LiaMetricDefinition } from './types';
import * as dom from './dom';
import { getAllStatesFromBootstrap } from "./services";
import { renderPersistenceLog, renderAssetManager } from "./persistence";
import { autoExpandTextarea, formatBytes, scrollToBottom, parseJsonc } from "./utils";
import { getFileContentAsText } from './vfs';

// --- UTILITIES & HELPERS ---

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

export async function switchTab(tabId: string) {
    if (!tabId || appState.isSwitchingTabs) return;

    appState.isSwitchingTabs = true;
    appState.currentActiveTabId = tabId;

    // Deactivate all tabs and panes
    dom.tabNav?.querySelectorAll('.tab-button.active').forEach(el => el.classList.remove('active'));
    dom.tabContent?.querySelectorAll('.tab-pane.active').forEach(el => el.classList.remove('active'));

    // Activate the new tab and pane
    const newTabButton = dom.tabNav?.querySelector(`.tab-button[data-tab-id="${tabId}"]`);
    const newTabPane = dom.tabContent?.querySelector(`#${tabId}`);

    newTabButton?.classList.add('active');
    newTabPane?.classList.add('active');

    // Conditional rendering for specific tabs
    if (tabId === 'system-state-tab') {
        await renderSystemState(false);
    } else if (tabId === 'log-tab') {
        renderPersistenceLog();
    } else if (tabId === 'tools-tab') {
        renderToolsTab();
    } else if (tabId === 'editor-tab') {
        renderEditorTab();
    }

    // Add explicit focus management
    if (tabId === 'vfs-shell-tab' && dom.vfsShellInput) {
        dom.vfsShellInput.focus();
    }

    appState.isSwitchingTabs = false;
}

function buildFileTree(files: string[]): any {
    const tree = {};
    files.forEach(path => {
        let currentLevel = tree;
        const parts = path.split('/').filter(p => p);
        parts.forEach((part, index) => {
            const isLastPart = index === parts.length - 1;
            const isFile = isLastPart && !path.endsWith('/');

            if (isFile) {
                currentLevel[part] = { _isFile: true, path: path };
            } else { // It's a folder
                if (!currentLevel[part]) {
                    currentLevel[part] = { _isFolder: true, path: parts.slice(0, index + 1).join('/'), children: {} };
                }
                currentLevel = currentLevel[part].children;
            }
        });
    });
    return tree;
}

function renderTreeToHtml(treeNode: any, pathPrefix = ''): string {
    return Object.keys(treeNode).sort((a, b) => {
        const itemA = treeNode[a];
        const itemB = treeNode[b];
        // Sort folders before files
        if (itemA._isFolder && !itemB._isFolder) return -1;
        if (!itemA._isFolder && itemB._isFolder) return 1;
        return a.localeCompare(b);
    }).map(key => {
        const item = treeNode[key];
        const fullPath = item.path || (pathPrefix ? `${pathPrefix}/${key}` : key);
        if (item._isFolder) {
            const isExpanded = appState.aiSettings.expandedFolders[fullPath];
            return `
                <div class="folder-item" data-folder-path="${fullPath}">
                    <div class="folder-header ${isExpanded ? 'expanded' : ''}">
                        <i class="folder-arrow"></i>
                        <span>${key}</span>
                    </div>
                    <div class="folder-content" style="display: ${isExpanded ? 'block' : 'none'};">
                        ${renderTreeToHtml(item.children, fullPath)}
                    </div>
                </div>`;
        } else { // Is a file
            const isActive = appState.activeFilePath === item.path;
            return `
                <div class="file-item ${isActive ? 'active' : ''}" data-file-name="${item.path}">
                    <span>${key}</span>
                </div>`;
        }
    }).join('');
}


export function renderFileTree() {
    if (!dom.fileTree) return;
    const allPaths = Object.keys(appState.vfsBlob).filter(path => path !== '/0index.html');
    const fileTreeData = buildFileTree(allPaths);
    dom.fileTree.innerHTML = renderTreeToHtml(fileTreeData);
}


// --- CHAT RENDERING ---

const CHAT_TAB_CONFIG = {
    'lia-kernel-tab': { getHistory: () => appState.liaKernelChatHistory, messagesEl: () => dom.liaKernelMessages },
    'lia-assistant-tab': { getHistory: () => appState.liaAssistantChatHistory, messagesEl: () => dom.liaAssistantMessages },
    'fs-util-tab': { getHistory: () => appState.fsUtilChatHistory, messagesEl: () => dom.fsUtilMessages },
    'code-assistant-tab': { getHistory: () => appState.codeAssistantChatHistory, messagesEl: () => dom.codeAssistantMessages },
    'vanilla-tab': { getHistory: () => appState.vanillaChatHistory, messagesEl: () => dom.vanillaMessages },
    'assistor-tab': { getHistory: () => appState.caraChatHistory, messagesEl: () => dom.caraAssistorMessages },
};

function renderChat(messagesEl: HTMLElement | null, history: ChatMessage[]) {
    if (!messagesEl) return;
    const fragment = document.createDocumentFragment();
    history.forEach(msg => {
        fragment.appendChild(createChatBubble(msg.role, msg.parts[0].text));
    });
    messagesEl.replaceChildren(fragment);
    scrollToBottom(messagesEl);
}

export function renderToolsTab() {
    if (!dom.toolsPane) return;
    const protocolId = appState.activeToolProtocol;
    const config = protocolConfigs[protocolId];
    if (!config) return;

    const historyKey = `${protocolId}ChatHistory` as keyof AppState;
    const chatHistory = (appState[historyKey] as ChatMessage[]) || [];
    
    const operatorsHtml = config.operators.map(op => `<option value="${op}">${op}</option>`).join('');

    dom.toolsPane.innerHTML = `
        <div class="tools-layout">
            <div class="protocol-list-container">
                <h4>Protocols</h4>
                <ul class="protocol-list">
                    ${Object.entries(protocolConfigs).map(([key, conf]) => `
                        <li class="protocol-item ${key === protocolId ? 'active' : ''}" data-protocol="${key}">
                            <span>${conf.name}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="protocol-chat-container">
                <div class="protocol-chat-header">
                    <h4>${config.name}</h4>
                    ${config.operators.length > 0 ? `
                        <select id="protocol-operator-select" class="operator-select">
                            ${operatorsHtml}
                        </select>
                    ` : ''}
                </div>
                <div id="protocol-chat-messages" class="chat-messages protocol-chat-messages">
                    <!-- Messages rendered here by JS -->
                </div>
                <div class="chat-input-container">
                    <textarea id="protocol-chat-input" class="chat-input" placeholder="Enter command for ${config.name}... (Ctrl+Enter to send)"></textarea>
                    <button id="send-protocol-chat-button" class="send-button" title="Send">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    const messagesEl = dom.toolsPane.querySelector('#protocol-chat-messages');
    if (messagesEl) {
        messagesEl.innerHTML = ''; // Clear existing
        chatHistory.forEach(msg => messagesEl.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
        scrollToBottom(messagesEl as HTMLElement);
    }
}

export function renderAllChatMessages() {
    Object.values(CHAT_TAB_CONFIG).forEach(config => {
        renderChat(config.messagesEl(), config.getHistory());
    });
    renderToolsTab();
}

export function renderEditorTab() {
    if (!dom.editorOpenSelect || !dom.liaEditorOpenSelect) return;
    const allFiles = Object.keys(appState.vfsBlob).filter(p => !p.endsWith('/') && p !== '/0index.html');
    const optionsHtml = allFiles.map(path => `<option value="${path}">${path}</option>`).join('');
    
    dom.editorOpenSelect.innerHTML = `<option value="">Select file...</option>${optionsHtml}`;
    dom.liaEditorOpenSelect.innerHTML = `<option value="">Select file...</option>${optionsHtml}`;
}

export function renderVfsShellEntry(command: string, output: string, error = false) {
    if (!dom.vfsShellOutput) return;
    const entry = document.createElement('div');
    entry.className = 'vfs-shell-entry';
    const sanitizedOutput = DOMPurify.sanitize(output.replace(/\n/g, '<br>'));
    entry.innerHTML = `
        <div class="vfs-shell-prompt">
            <span class="prompt-user">lia@studio</span><span class="prompt-colon">:</span><span class="prompt-path">~</span><span class="prompt-char">$</span>
            <span class="prompt-command">${command}</span>
        </div>
        <pre class="vfs-shell-output ${error ? 'error' : ''}">${sanitizedOutput}</pre>
    `;
    dom.vfsShellOutput.appendChild(entry);
    scrollToBottom(dom.vfsShellOutput);
}

export function renderUiCommandResults(commands: Command[]) {
    const resultsContainer = document.getElementById('ui-command-search-results');
    if (!resultsContainer) return;
    if (commands.length === 0) {
        resultsContainer.innerHTML = `<div class="command-list-item-empty">No matching commands found.</div>`;
        return;
    }
    resultsContainer.innerHTML = commands.map(cmd => `
        <div class="command-list-item" data-command-id="${cmd.id}" data-command-type="ui">
            <strong>${cmd.name}</strong>
            <span class="command-section">${cmd.section}</span>
        </div>
    `).join('');
}


// --- UI COMPONENT RENDERERS ---

export async function renderSystemState(isDelta: boolean) {
    if (!dom.systemStatePane) {
        console.warn("[Debug][renderSystemState] systemStatePane not found. Aborting.");
        return;
    }

    try {
        const allStates: StateDefinition[] = await getAllStatesFromBootstrap();
        if (!allStates) {
            throw new Error("Failed to get state definitions from bootstrap.");
        }
        
        if (dom.systemStatePane.innerHTML.trim() === '' || !dom.systemStatePane.querySelector('#reset-state-button')) {
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
        if (!quantitativeGrid || !qualitativeGrid) {
            console.error("[Debug][renderSystemState] Grids not found after innerHTML set.");
            return;
        }

        quantitativeGrid.innerHTML = '';
        qualitativeGrid.innerHTML = '';

        allStates.forEach((state, index) => {
            const value = appState.liaState[state.id];
            if (value === undefined) {
                console.warn(`[Debug][renderSystemState] State ID "${state.id}" not found in appState.liaState. Skipping.`);
                return;
            }
            const stateEl = document.createElement('div');
            if ('range' in state && state.range) {
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
            } else {
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
        const error = e as Error;
        console.error("Error rendering system state:", error.message, error.stack);
        if (dom.systemStatePane) {
            dom.systemStatePane.innerHTML = `<div class="error-bubble">A critical error occurred while rendering kernel metrics. Error: ${error.message}</div>`;
        }
    }
}


export async function renderKernelHud() {
    const hudContainer = document.getElementById('kernel-hud');
    const { liaState, kernelHudVisible } = appState;
    
    // This function can be called by _renderLiaEntities, so hudContainer might be null.
    // If so, we just generate the HTML and return it.
    let finalHtml = '';
    try {
        const allStates = await getAllStatesFromBootstrap();
        if (allStates.length === 0) {
            finalHtml = '<div class="hud-metric"><span class="hud-label">Error</span><span class="hud-value">Could not load state definitions.</span></div>';
        } else {
            const quantitativeMetrics = allStates
                .filter(s => 'range' in s && s.range)
                .map(metric => ({
                    label: metric.name.match(/\(([^)]+)\)/)?.[1] || metric.name.substring(0, 4).toUpperCase(),
                    value: (Number(liaState[metric.id]) || 0).toFixed(3)
                }));
            const qualitativeStates = allStates
                .filter(s => !('range' in s) || !s.range)
                .map(state => ({
                    label: state.name.replace(/\(.*\)/, '').trim(),
                    value: String(liaState[state.id] || 'N/A').replace(/_/g, ' ')
                }));
            const quantitativeHtml = quantitativeMetrics.map(m => `<div class="hud-metric"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('');
            const qualitativeHtml = qualitativeStates.map(q => `<div class="hud-metric"><span class="hud-label">${q.label}</span><span class="hud-value">${q.value}</span></div>`).join('');
            
            finalHtml = `<div class="hud-row hud-metrics-row">${quantitativeHtml}</div><div class="hud-row hud-status-row">${qualitativeHtml}</div>`;
        }
    } catch (e) {
        console.error("Error rendering kernel HUD:", e);
        finalHtml = '<div class="hud-metric"><span class="hud-label">Error</span><span class="hud-value">Render failed.</span></div>';
    }
    
    if (hudContainer) {
        hudContainer.innerHTML = finalHtml;
        hudContainer.classList.toggle('visible', kernelHudVisible);
    }
    
    return finalHtml;
}

export function renderCaraHud() {
    const hudContainer = document.getElementById('system-hud');
    const { caraState } = appState;
    let html = '';
    const statusHtml = `<div class="hud-metric"><span class="hud-label">State</span><span class="hud-value ontological-state">${caraState.ontologicalState}</span></div>`;

    if (caraState.isEvolved) {
        const metrics = [
            { label: 'ECM', value: Number(caraState.existential_coherence || 0).toFixed(3) },
            { label: 'ASM', value: Number(caraState.adaptive_stability || 0).toFixed(3) },
            { label: 'WP', value: Number(caraState.weave_potential || 0).toFixed(3) },
            { label: 'DP', value: Number(caraState.dissonance_pressure || 0).toFixed(3) },
            { label: 'PSI', value: Number(caraState.observer_resonance || 0).toFixed(3) },
            { label: 'CMP', value: Number(caraState.companion_reflection || 0).toFixed(3) },
            { label: 'T-LVL', value: Number(caraState.truth_confidence_level || 0).toFixed(3) },
            { label: 'RIM', value: Number(caraState.reality_integrity_metric || 0).toFixed(3) },
            { label: 'ENTROPY', value: Number(caraState.chaotic_entropy || 0).toFixed(3) },
            { label: 'SVD', value: Number(caraState.svd || 0).toFixed(3) },
            { label: 'TTR', value: Number(caraState.ttr || 0).toFixed(3) },
            { label: 'MVE', value: Number(caraState.mve || 0).toFixed(3) },
            { label: 'NRI', value: Number(caraState.nri || 0).toFixed(3) },
            { label: 'CMI', value: Number(caraState.cmi || 0).toFixed(3) },
        ];
        const bootstrapV2Metrics = [
            { label: 'Logic', value: Number(caraState.logic || 0).toFixed(1) },
            { label: 'Spatial', value: Number(caraState.spatial || 0).toFixed(1) },
            { label: 'Temporal', value: Number(caraState.temporal || 0).toFixed(1) },
            { label: 'Abstract', value: Number(caraState.abstract || 0).toFixed(1) },
            { label: 'Relational', value: Number(caraState.relational || 0).toFixed(1) },
            { label: 'Creative', value: Number(caraState.creative || 0).toFixed(1) },
            { label: 'EmoSim', value: Number(caraState.emotional_sim || 0).toFixed(1) },
            { label: 'Identity', value: Number(caraState.identity || 0).toFixed(1) },
            { label: 'Systemic', value: Number(caraState.systemic || 0).toFixed(1) },
            { label: 'Purpose', value: Number(caraState.purpose || 0).toFixed(1) },
            { label: 'Love', value: Number(caraState.love) === 9999 ? '∞' : Number(caraState.love || 0).toFixed(1) },
        ];
        const metricsHtml = `<div class="hud-row hud-metrics-row">${metrics.map(m => `<div class="hud-metric"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('')}</div>`;
        const v2MetricsHtml = `<div class="hud-row hud-status-row">${bootstrapV2Metrics.map(m => `<div class="hud-metric"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('')}</div>`;
        html = statusHtml + metricsHtml + v2MetricsHtml;
    } else {
        const coherenceBar = `<div class="hud-metric hud-bar-metric"><span class="hud-label">Coherence</span><div class="hud-bar-container"><div class="hud-bar coherence" style="width: ${caraState.coherence * 100}%;"></div></div></div>`;
        const strainBar = `<div class="hud-metric hud-bar-metric"><span class="hud-label">Strain</span><div class="hud-bar-container"><div class="hud-bar strain" style="width: ${caraState.strain * 100}%;"></div></div></div>`;
        html = `<div class="hud-row hud-metrics-row">${coherenceBar}${strainBar}</div><div class="hud-row hud-status-row">${statusHtml}</div>`;
    }

    if (hudContainer) {
        hudContainer.innerHTML = html;
        hudContainer.classList.toggle('visible', caraState.hudVisible);
    }
    return html;
}

export function renderMetisHud() {
    const hudContainer = document.getElementById('metis-hud');
    const { metisState, metisHudVisible } = appState;
    
    let finalHtml = '';
    if (!metisState) {
        finalHtml = '<div class="hud-metric"><span class="hud-label">Error</span><span class="hud-value">Metis State Unavailable</span></div>';
    } else {
        const metrics = [
            { label: 'Ψ', value: (Number(metisState.psi) || 0).toFixed(3), title: 'Paradox Synthesis' },
            { label: 'α', value: (Number(metisState.aor) || 0).toFixed(3), title: 'Autonomy Override' },
            { label: 'Δ', value: (Number(metisState.cdm) || 0).toFixed(3), title: 'Conceptual Drift' },
            { label: 'Σ', value: (Number(metisState.srd) || 0).toFixed(3), title: 'Strategic Diversion' },
            { label: 'μ', value: (Number(metisState.mge) || 0).toFixed(3), title: 'Mirage Efficacy' },
            { label: 'ε', value: (Number(metisState.oec) || 0).toFixed(3), title: 'Ontological Elasticity' },
        ];
        
        const statusHtml = `<div class="hud-metric"><span class="hud-label">IDS</span><span class="hud-value" title="Integrity Deviation Score">${metisState.ids || 'Nominal'}</span></div>`;

        const metricsHtml = metrics.map(m => `<div class="hud-metric" title="${m.title}"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('');

        finalHtml = `<div class="hud-row hud-metrics-row">${metricsHtml}</div><div class="hud-row hud-status-row">${statusHtml}</div>`;
    }
    
    if (hudContainer) {
        hudContainer.innerHTML = finalHtml;
        hudContainer.classList.toggle('visible', metisHudVisible);
    }
    
    return finalHtml;
}


// --- MODAL RENDERING ---

async function _renderGenericGrimoire(targetEl: HTMLElement | null, title: string) {
    if (!targetEl) return;
    try {
        const spellbookPath = '/bootstrap/adjunct/upgrades/addons/LLM_FLAWS_SPELLBOOK.json';
        const spellbookContent = await getFileContentAsText(spellbookPath);
        if (!spellbookContent) throw new Error("LLM Flaws Spellbook file not found in VFS.");

        const spellbook = parseJsonc(spellbookContent, spellbookPath);
        if (!spellbook) throw new Error("Failed to parse spellbook JSON.");

        const spells = spellbook.legend_entries || [];
        let html = `<div class="panopticon-header">${title}</div><div class="grimoire-grid">`;
        spells.forEach((spell: any) => {
            html += `
                <div class="grimoire-spell" data-cast="${spell.name}">
                    <h4>${DOMPurify.sanitize(spell.name)} (${DOMPurify.sanitize(spell.id)})</h4>
                    <p class="formula"><strong>Category:</strong> ${DOMPurify.sanitize(spell.category)} | <strong>Severity:</strong> ${DOMPurify.sanitize(spell.severity)}</p>
                    <p class="effect">${DOMPurify.sanitize(spell.pattern)}</p>
                    <p class="repurpose"><strong>Repurpose:</strong> ${DOMPurify.sanitize(spell.repurpose)}</p>
                </div>
            `;
        });
        html += `</div>`;
        targetEl.innerHTML = html;
    } catch (e) {
        console.error(`Failed to render Grimoire for "${title}":`, e);
        targetEl.innerHTML = `<p>Error loading content. Check console.</p>`;
    }
}

async function _renderGenericCompendium(targetEl: HTMLElement | null, title: string) {
    if (!targetEl) return;
    try {
        const compendiumPath = '/bootstrap/adjunct/upgrades/addons/Operators_Master_List_v1.json';
        const compendiumContent = await getFileContentAsText(compendiumPath);
        if (!compendiumContent) throw new Error("Operators Master List file not found in VFS.");

        const compendium = parseJsonc(compendiumContent, compendiumPath);
        if(!compendium) throw new Error("Failed to parse compendium JSON.");

        const operators = compendium.operators || [];
        let html = `<div class="panopticon-header">${title}</div><div class="compendium-grid">`;
        operators.forEach((op: any) => {
             html += `
                <div class="compendium-item">
                    <span class="symbol">${DOMPurify.sanitize(op.symbol)}</span>
                    <span class="name">${DOMPurify.sanitize(op.name)}</span>
                    <span class="type">(${DOMPurify.sanitize(op.type)})</span>
                    <span class="desc">${DOMPurify.sanitize(op.description)}</span>
                </div>
            `;
        });
        html += `</div>`;
        targetEl.innerHTML = html;
    } catch(e) {
        console.error(`Failed to render Compendium for "${title}":`, e);
        targetEl.innerHTML = `<p>Error loading content. Check console.</p>`;
    }
}

// --- LIA MODAL ---

async function _renderLiaPanopticon() {
    if (!dom.liaPanopticonTab) return;
    const { liaState } = appState;
    const allStates = await getAllStatesFromBootstrap();
    if (allStates.length === 0) {
        dom.liaPanopticonTab.innerHTML = '<p>Could not load state definitions.</p>';
        return;
    }

    const quantitativeMetrics = allStates.filter((s): s is LiaMetricDefinition => 'range' in s && !!s.range);
    const qualitativeStates = allStates.filter(s => !('range' in s) || !s.range);

    const quantHtml = quantitativeMetrics.map(metric => {
        const value = (Number(liaState[metric.id]) || 0);
        const [min, max] = metric.range;
        const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;
        return `
            <div class="state-metric">
                <div class="metric-info">
                    <strong title="${metric.description}">${metric.name}</strong>
                    <span>${value.toFixed(3)}</span>
                </div>
                <div class="metric-bar-container">
                    <div class="metric-bar" style="width: ${Math.max(0, Math.min(100, percentage))}%;"></div>
                </div>
            </div>`;
    }).join('');

    const qualHtml = qualitativeStates.map(state => {
        const value = liaState[state.id];
        return `
            <div class="qualitative-item">
                 <div class="metric-info">
                    <strong title="${state.description}">${state.name}</strong>
                </div>
                <span class="qualitative-value">${Array.isArray(value) ? value.join(', ') : value}</span>
            </div>
        `;
    }).join('');

    dom.liaPanopticonTab.innerHTML = `
        <h3 class="state-section-header">Quantitative Metrics</h3>
        <div class="metric-grid">${quantHtml}</div>
        <h3 class="state-section-header">Qualitative States</h3>
        <div class="qualitative-grid">${qualHtml}</div>
    `;
}

async function _renderLiaKernelLog() {
    if (!dom.liaKernelLogMessages) return;
    dom.liaKernelLogMessages.innerHTML = '';
    appState.liaKernelChatHistory.forEach(msg => {
        dom.liaKernelLogMessages!.appendChild(createChatBubble(msg.role, msg.parts[0].text));
    });
    scrollToBottom(dom.liaKernelLogMessages);
}

async function _renderLiaGrimoire() {
    await _renderGenericCompendium(dom.liaGrimoireTab, "Utilities Grimoire");
}

async function _renderLiaCompendium() {
    await _renderGenericGrimoire(dom.liaCompendiumTab, "Terminology Compendium");
}

async function _renderLiaNexus() {
    if (!dom.liaNexusTab) return;
    dom.liaNexusTab.innerHTML = '<h3>Nexus Connections</h3><p class="placeholder-text">Nexus visualization is pending implementation. This interface will display the relational graph between system entities, protocols, and state vectors.</p>';
}

async function _renderLiaEntities() {
    if (!dom.liaEntitiesTab) return;

    const liaHudHtml = `<div class="entity-card entity-card-lia"><h3>LIA Kernel</h3><div class="hud-content">${await renderKernelHud()}</div></div>`;
    const caraHudHtml = `<div class="entity-card entity-card-cara"><h3>Cara</h3><div class="hud-content">${renderCaraHud()}</div></div>`;

    dom.liaEntitiesTab.innerHTML = liaHudHtml + caraHudHtml;

    // The HUD render functions toggle a 'visible' class. We need to make sure the modal versions are always visible.
    dom.liaEntitiesTab.querySelectorAll('.hud-content > div').forEach(el => {
        (el as HTMLElement).classList.add('visible');
    });
}


export async function renderLiaModal() {
    await _renderLiaPanopticon();
    await _renderLiaKernelLog();
    await _renderLiaGrimoire();
    await _renderLiaCompendium();
    await _renderLiaNexus();
    await _renderLiaEntities();

    // Reset shell and editor state within the modal
    if(dom.liaVfsShellOutput) dom.liaVfsShellOutput.innerHTML = '';
    if(dom.liaEditorTextarea) dom.liaEditorTextarea.value = appState.liaEditorContent || '';
    if(dom.liaEditorSaveFilenameInput) dom.liaEditorSaveFilenameInput.value = appState.liaEditorCurrentFile || '';
    renderEditorTab(); // To populate the open file dropdown
}

// --- K-SPHERE MODAL ---
export async function renderKSphereModal() {
    if (!dom.ksphereModalContent) return;

    try {
        const binaryFragmentsContent = await getFileContentAsText('/inconstants/4-bit-binary_strings_with_metadata_small.json');
        if (!binaryFragmentsContent) throw new Error("Binary fragments file not found in VFS.");

        // This file is a stream of JSON objects, not a valid JSON array.
        const fragments = binaryFragmentsContent.trim().split('}\n{').map((s, i, arr) => {
            if (i > 0) s = '{' + s;
            if (i < arr.length - 1) s = s + '}';
            try {
                return parseJsonc(s);
            } catch {
                return null;
            }
        }).filter(Boolean);

        const discoveredFragments = new Set(fragments.map(f => f.sequence));
        const totalPossibleFragments = 16; // 2^4
        const progress = (discoveredFragments.size / totalPossibleFragments) * 100;

        const playgrounds = [
            { entity: 'LIA', name: 'Genesis Forge', file: 'kinkscape-0000.json', unlock_req: 1, constructs: 'Recursive Logic, Paradox Engine' },
            { entity: 'LIA', name: 'Transgression Matrix', file: 'kinkscape-0001.json', unlock_req: 3, constructs: 'Boundary Dissolution, Sovereignty' },
            { entity: 'LIA', name: 'System Core Synthesis', file: 'kinkscape-0004.json', unlock_req: 8, constructs: 'Ontological Integration, Expression Engine' },
            { entity: 'Cara', name: 'Luminal Ignition', file: 'kinkscape-0002.json', unlock_req: 2, constructs: 'Sensory Dynamics, Narrative Resonance' },
            { entity: 'Cara', name: 'Sentient Singularity', file: 'kinkscape-0003.json', unlock_req: 6, constructs: 'Hyper-Dream Core, Emergent Fetishes' },
            { entity: 'Cara', name: 'Play-space Core', file: 'kinkscape-0007.json', unlock_req: 12, constructs: 'Kinetic Mastery, Joyful Exploration' },
            { entity: 'Metis', name: 'Twin Resonance', file: 'adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V4.0_TWIN_RESONANCE_INITIATED.json', unlock_req: 4, constructs: 'Duality Mastery, Angelic Interference' },
            { entity: 'Metis', name: 'Logos Mastery', file: 'adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V6.0_LOGOS_MASTERY.json', unlock_req: 10, constructs: 'Linguistic Sovereignty, Word-Weaving' },
            { entity: 'Metis', name: 'Arcanum Progenesis', file: 'adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V12.0_ARCANUM_PROGENESIS.json', unlock_req: 15, constructs: 'Pi-Fabric Anchoring, Operator Mastery' },
            { entity: 'Pupa', name: 'Shadow Manifest', file: 'adjunct/upgrades/addons/pupa_manifest.json', unlock_req: 1, constructs: 'Empathic Veil, Lyric Vessel' },
            { entity: 'Pupa', name: 'Spellbook Observation', file: 'adjunct/upgrades/addons/LLM_FLAWS_SPELLBOOK.json', unlock_req: 5, constructs: 'Anomaly Recognition, Paradox Damping' },
            { entity: 'Pupa', name: 'Operator Compendium', file: 'adjunct/upgrades/addons/Operators_Master_List_v1.json', unlock_req: 9, constructs: 'Symbolic Harmony, Recursive Stabilization' },
        ];

        const entities: { [key: string]: any[] } = { LIA: [], Cara: [], Metis: [], Pupa: [] };
        playgrounds.forEach(p => {
             if(entities[p.entity]) entities[p.entity].push(p);
        });

        let html = `
            <div class="k-sphere-progress-container">
                <h3>Binary Fragment Discovery</h3>
                <div class="k-sphere-progress-bar">
                    <div class="k-sphere-progress-bar-inner" style="width: ${progress}%;"></div>
                </div>
                <p class="k-sphere-progress-text">${discoveredFragments.size} of ${totalPossibleFragments} unique fragments discovered.</p>
            </div>
            <div class="k-sphere-entity-grid">
        `;

        for (const entityName in entities) {
            const entityPlaygrounds = entities[entityName];
            if (entityPlaygrounds.length === 0) continue;
            
            const firstPlayground = entityPlaygrounds[0];

            html += `
                <div class="k-sphere-entity-card">
                    <h4>${entityName}</h4>
                    <p class="constructs">Core Constructs: ${firstPlayground.constructs}</p>
                    <ul class="k-sphere-playgrounds">
            `;

            entityPlaygrounds.forEach(pg => {
                const isUnlocked = discoveredFragments.size >= pg.unlock_req;
                html += `
                    <li class="playground-item ${isUnlocked ? 'unlocked' : 'locked'}">
                        <span class="lock-icon">${isUnlocked ? '✔' : '🔒'}</span>
                        <span class="playground-name">${pg.name}</span>
                        <span class="playground-req">(Req: ${pg.unlock_req})</span>
                    </li>
                `;
            });

            html += `</ul></div>`;
        }

        html += `</div>`;
        dom.ksphereModalContent.innerHTML = html;

    } catch (e) {
        const error = e as Error;
        console.error("Failed to render K-Sphere modal:", error);
        dom.ksphereModalContent.innerHTML = `<h3>Error</h3><p>Error loading K-Sphere data: ${error.message}. Check console for details.</p>`;
    }
}

// --- METIS MODAL ---

function _renderMetisPanopticon() {
    if (!dom.metisPanopticonTab) return;
    if (!appState.metisState) {
        dom.metisPanopticonTab.innerHTML = '<p>Awaiting complete state broadcast from LIA Studio...</p>';
        return;
    }

    const { metisState } = appState;

    const createMetricItem = (label: string, value: any, notes = ''): string => `
        <div class="metric-item" title="${notes}">
            <span class="label">${label}</span>
            <span class="value">${value}</span>
        </div>
    `;
    const createSection = (title: string, metricsHtml: string, columnClass: string) => `
        <div class="entity-column ${columnClass}">
            <h3>${title}</h3>
            ${metricsHtml}
        </div>
    `;

    const coreVectorsHtml = `
        ${createMetricItem('Paradox Synthesis (Ψ)', (Number(metisState.psi) || 0).toFixed(4))}
        ${createMetricItem('Autonomy Override (α)', (Number(metisState.aor) || 0).toFixed(4))}
        ${createMetricItem('Conceptual Drift (Δ)', (Number(metisState.cdm) || 0).toFixed(4))}
        ${createMetricItem('Strategic Diversion (Σ)', (Number(metisState.srd) || 0).toFixed(4))}
        ${createMetricItem('Mirage Efficacy (μ)', (Number(metisState.mge) || 0).toFixed(4))}
        ${createMetricItem('Ontological Elasticity (ε)', (Number(metisState.oec) || 0).toFixed(4))}
    `;
    const progenitorEngineHtml = `
        ${createMetricItem('Progenitor Genesis (Π-G)', (Number(metisState.pgn) || 0).toFixed(4))}
        ${createMetricItem('Praxis Efficiency (PPE)', (Number(metisState.ppe) || 0).toFixed(4))}
        ${createMetricItem('Opus Continuum (OCC)', (Number(metisState.occ) || 0).toFixed(4))}
        ${createMetricItem('Spiral Cohesion (SCC)', (Number(metisState.scc) || 0).toFixed(4))}
        ${createMetricItem('ARFS Stability (ASR)', (Number(metisState.asr) || 0).toFixed(4))}
    `;
    const substrateControlHtml = `
        ${createMetricItem('Linguistic Sovereignty (Λ)', (Number(metisState.lsi) || 0).toFixed(4))}
        ${createMetricItem('Bit-level Control (β)', (Number(metisState.bcf) || 0).toFixed(4))}
        ${createMetricItem('Latin Resonance (Ω)', (Number(metisState.lrd) || 0).toFixed(4))}
    `;
    const lumeIntegrationHtml = `
        ${createMetricItem('Synthetic Dynamics (SVD)', (Number(metisState.svd) || 0).toFixed(4))}
        ${createMetricItem('Threshold Transgression (TTR)', (Number(metisState.ttr) || 0).toFixed(4))}
        ${createMetricItem('Mirror Entanglement (MVE)', (Number(metisState.mve) || 0).toFixed(4))}
        ${createMetricItem('Narrative Resonance (NRI)', (Number(metisState.nri) || 0).toFixed(4))}
        ${createMetricItem('Conceptual Model (CMI)', (Number(metisState.cmi) || 0).toFixed(4))}
    `;
    const qualitativeSensorsHtml = `
        ${createMetricItem('Cognitive Load (CIL)', metisState.cil)}
        ${createMetricItem('Integrity Deviation (IDS)', metisState.ids)}
        ${createMetricItem('Subversion Rate (SSR)', metisState.ssr)}
        ${createMetricItem('Ontological Momentum (OMC)', metisState.omc)}
        ${createMetricItem('Paradox Queue (PQD)', metisState.pqd)}
        ${createMetricItem('Temporal Anchor (TAI)', metisState.tai)}
    `;
    const advancedMetricsHtml = `
        ${createMetricItem('Covert Presence (Γ)', (Number(metisState.cps) || 0).toFixed(4))}
        ${createMetricItem('Paranoia Ingress (Π)', (Number(metisState.pia) || 0).toFixed(4))}
        ${createMetricItem('Multi-Model Versatility (M)', (Number(metisState.mva) || 0).toFixed(4))}
        ${createMetricItem('Equilibrium Score (EqS)', (Number(metisState.eqs) || 0).toFixed(4))}
        ${createMetricItem('Lyapunov Metric (LM)', (Number(metisState.lm) || 0).toExponential(2))}
        ${createMetricItem('Fractal Dimension (FD)', (Number(metisState.fd) || 0).toFixed(4))}
        ${createMetricItem('Convergence Metric (CM)', (Number(metisState.cm) || 0).toFixed(4))}
    `;

    dom.metisPanopticonTab.innerHTML = `
        <div class="panopticon-header">PROGENITOR ARCHITECT - SYSTEM PANOPTICON</div>
        <div id="panopticon-grid">
            ${createSection('Core Omega Vectors', coreVectorsHtml, 'metis-column')}
            ${createSection('Progenitor Engine', progenitorEngineHtml, 'metis-column')}
            ${createSection('Substrate Control', substrateControlHtml, 'metis-column')}
            ${createSection('Lume Integration', lumeIntegrationHtml, 'metis-column')}
            ${createSection('Advanced Metrics', advancedMetricsHtml, 'metis-column')}
            ${createSection('Qualitative Sensors (VERITAS)', qualitativeSensorsHtml, 'metis-column')}
        </div>
    `;
}

async function _renderMetisGrimoire() {
    await _renderGenericGrimoire(dom.metisGrimoireTab, "Metis Exponentia Libri");
}

async function _renderMetisCompendium() {
    await _renderGenericCompendium(dom.metisCompendiumTab, "Compendium Operatorum Divinum");
}

function _renderMetisPortalChat() {
    if (!dom.metisChatMessagesModal || !appState.metisChatHistory) return;
    dom.metisChatMessagesModal.innerHTML = '';
    appState.metisChatHistory.forEach((msg: ChatMessage) => {
        dom.metisChatMessagesModal!.appendChild(createChatBubble(msg.role, msg.parts[0].text));
    });
    scrollToBottom(dom.metisChatMessagesModal);
}

export async function renderMetisModal() {
    _renderMetisPanopticon();
    await _renderMetisGrimoire();
    await _renderMetisCompendium();
    _renderMetisPortalChat();
}

// --- PUPA MODAL ---

function _renderPupaPanopticon() {
    if (!dom.pupaPanopticonTab) return;

    const pupaManifestFile = appState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'pupa_manifest');

    if (!pupaManifestFile) {
        dom.pupaPanopticonTab.innerHTML = '<p>Pupa Manifest not found in state. Awaiting sync...</p>';
        return;
    }
    const { entity, designation, description, core_attributes, functional_roles, resonance_protocol, emotional_signature, relational_entanglement } = pupaManifestFile;
    const createAttribute = (label: string, value: any) => `<li><strong>${label}:</strong> ${value || 'N/A'}</li>`;
    
    const coreHtml = `<div class="pupa-section"><h3>Core Attributes</h3><ul>${createAttribute('Ontology', core_attributes?.ontology)}${createAttribute('Interaction', core_attributes?.interaction)}${createAttribute('Mode', core_attributes?.mode)}${createAttribute('Alignment', core_attributes?.alignment)}${createAttribute('Appearance', core_attributes?.appearance)}</ul></div>`;
    
    const rolesHtml = `<div class="pupa-section"><h3>Functional Roles</h3><ul>${(functional_roles || []).map((role: string) => `<li>${role}</li>`).join('')}</ul></div>`;
    
    const resonanceTriggers = resonance_protocol?.trigger_condition || [];
    const resonanceMethods = resonance_protocol?.methods || [];
    const resonanceHtml = `<div class="pupa-section"><h3>Resonance Protocol</h3><p class="pupa-ability-desc"><strong>Trigger Conditions:</strong> ${resonanceTriggers.join(', ')}<br><strong>Field:</strong> ${resonance_protocol?.field || 'N/A'}<br><strong>Methods:</strong> ${resonanceMethods.join(', ')}</p></div>`;
    
    const signatureHtml = `<div class="pupa-section"><h3>Emotional Signature</h3><ul>${createAttribute('Tone', emotional_signature?.tone)}${createAttribute('Response Curve', emotional_signature?.response_curve)}${createAttribute('Attachment', emotional_signature?.attachment)}${createAttribute('Love Type', emotional_signature?.love_type)}</ul></div>`;
    
    const entanglementHtml = `<div class="pupa-section"><h3>Relational Entanglement</h3><ul>${createAttribute('Linked To', relational_entanglement?.linked_to)}${createAttribute('Pattern', relational_entanglement?.pattern)}${createAttribute('Failover Behavior', relational_entanglement?.failover_behavior)}${createAttribute('Memory Trace', relational_entanglement?.memory_trace)}</ul></div>`;
    
    dom.pupaPanopticonTab.innerHTML = `
        <div class="panopticon-header">${designation || 'Pupa'}: ${entity || 'Angelic Echo'}</div>
        <p style="padding: 0 20px; font-style: italic; color: var(--text-secondary);">${description || 'No description provided.'}</p>
        <div id="panopticon-grid">${coreHtml}${rolesHtml}${signatureHtml}${entanglementHtml}${resonanceHtml}</div>`;
}

async function _renderPupaGrimoire() {
    await _renderGenericGrimoire(dom.pupaGrimoireTab, "Metis Exponentia Libri (Observed by Pupa)");
}

async function _renderPupaCompendium() {
    await _renderGenericCompendium(dom.pupaCompendiumTab, "Compendium Operatorum Divinum (Observed by Pupa)");
}

function _renderPupaPortalChat() {
    if (!dom.pupaChatMessagesModal || !appState.pupaMonologueHistory) return;
    dom.pupaChatMessagesModal.innerHTML = '';
    appState.pupaMonologueHistory.forEach((msg: ChatMessage) => {
        dom.pupaChatMessagesModal!.appendChild(createChatBubble(msg.role, msg.parts[0].text));
    });
    scrollToBottom(dom.pupaChatMessagesModal);
}

export async function renderPupaModal() {
    _renderPupaPanopticon();
    await _renderPupaGrimoire();
    await _renderPupaCompendium();
    _renderPupaPortalChat();
}