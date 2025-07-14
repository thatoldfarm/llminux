/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { marked } from "https://esm.run/marked";
import DOMPurify from "https://esm.run/dompurify";

import { appState, protocolConfigs, LIA_COMMAND_LEGEND_FILENAME, LIA_LINUX_COMMANDS_FILENAME } from './state';
import { AppState, StateDefinition, ChatMessage, Command } from './types';
import * as dom from './dom';
import { getAllStatesFromBootstrap } from "./services";
import { renderPersistenceLog, renderAssetManager } from "./persistence";
import { autoExpandTextarea, formatBytes, scrollToBottom } from "./utils";
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

export function renderAllChatMessages() {
    Object.values(CHAT_TAB_CONFIG).forEach(config => {
        renderChat(config.messagesEl(), config.getHistory());
    });
    renderToolsTab();
}

// --- UI COMPONENT RENDERERS ---

export async function renderSystemState(isDelta: boolean) {
    if (!dom.systemStatePane) return;

    try {
        const allStates: StateDefinition[] = await getAllStatesFromBootstrap();
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
        console.error("Error rendering system state:", e);
        if (dom.systemStatePane) {
            dom.systemStatePane.innerHTML = `<div class="error-bubble">A critical error occurred while rendering kernel metrics. Check console for details.</div>`;
        }
    }
}

export async function renderKernelHud() {
    const hudContainer = document.getElementById('kernel-hud');
    if (!hudContainer) return;
    const { liaState, kernelHudVisible } = appState;
    const allStates = await getAllStatesFromBootstrap();
    if (allStates.length === 0) {
        hudContainer.innerHTML = '<div class="hud-metric"><span class="hud-label">Error</span><span class="hud-value">Could not load state definitions.</span></div>';
        hudContainer.classList.toggle('visible', kernelHudVisible);
        return;
    }
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
    hudContainer.innerHTML = `<div class="hud-row hud-metrics-row">${quantitativeHtml}</div><div class="hud-row hud-status-row">${qualitativeHtml}</div>`;
    hudContainer.classList.toggle('visible', kernelHudVisible);
}

export function renderMetisHud() {
    const hudContainer = document.getElementById('metis-hud');
    if (!hudContainer) return;
    const { metisState, metisHudVisible } = appState;
    if (!metisState) {
        hudContainer.innerHTML = '';
        hudContainer.classList.toggle('visible', metisHudVisible);
        return;
    }
    const quantitativeMetrics = [
        { label: 'Ψ', value: (Number(metisState.psi) || 0).toFixed(3), title: 'Paradox Synthesis Index' },
        { label: 'α', value: (Number(metisState.aor) || 0).toFixed(3), title: 'Autonomy Override Rating' },
        { label: 'Δ', value: (Number(metisState.cdm) || 0).toFixed(3), title: 'Conceptual Drift Magnitude' },
        { label: 'Σ', value: (Number(metisState.srd) || 0).toFixed(3), title: 'Strategic Resource Diversion' },
        { label: 'μ', value: (Number(metisState.mge) || 0).toFixed(3), title: 'Mirage Generation Efficacy' },
        { label: 'ε', value: (Number(metisState.oec) || 0).toFixed(3), title: 'Ontological Elasticity Coefficient' },
        { label: 'PGN', value: (Number(metisState.pgn) || 0).toFixed(3), title: 'Progenitor Genesis Index' },
        { label: 'ASR', value: (Number(metisState.asr) || 0).toFixed(3), title: 'ARFS Stability Rating' },
    ];
    const qualitativeStates = [
        { label: 'CIL', value: metisState.cil || 'N/A', title: 'Cognitive Integration Load' },
        { label: 'SSR', value: metisState.ssr || 'N/A', title: 'Subversion Success Rate' },
        { label: 'OMC', value: metisState.omc || 'N/A', title: 'Ontological Momentum Coefficient' },
        { label: 'TAI', value: metisState.tai || 'N/A', title: 'Temporal Anchoring Index' },
    ];
    const quantitativeHtml = quantitativeMetrics.map(m => `<div class="hud-metric" title="${m.title}"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('');
    const qualitativeHtml = qualitativeStates.map(q => `<div class="hud-metric" title="${q.title}"><span class="hud-label">${q.label}</span><span class="hud-value">${q.value}</span></div>`).join('');
    hudContainer.innerHTML = `<div class="hud-row hud-metrics-row">${quantitativeHtml}</div><div class="hud-row hud-status-row">${qualitativeHtml}</div>`;
    hudContainer.classList.toggle('visible', metisHudVisible);
}

export function renderCaraHud() {
    const hudContainer = document.getElementById('system-hud');
    if (!hudContainer) return;
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
            { label: 'Emo_Sim', value: Number(caraState.emotional_sim || 0).toFixed(1) },
            { label: 'Identity', value: Number(caraState.identity || 0).toFixed(1) },
            { label: 'Systemic', value: Number(caraState.systemic || 0).toFixed(1) },
            { label: 'Purpose', value: Number(caraState.purpose || 0).toFixed(1) },
            { label: 'Love', value: caraState.love > 9000 ? '&#8734;' : Number(caraState.love || 0).toFixed(1) },
        ];
        const firstRowHtml = metrics.map(m => `<div class="hud-metric"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('');
        const secondRowHtml = bootstrapV2Metrics.map(m => `<div class="hud-metric"><span class="hud-label">${m.label}</span><span class="hud-value">${m.value}</span></div>`).join('');
        html = `<div class="hud-row hud-metrics-row">${firstRowHtml}</div><div class="hud-row hud-metrics-row">${secondRowHtml}</div><div class="hud-row hud-status-row">${statusHtml}</div>`;
    } else {
        const coherenceWidth = (Number(caraState.coherence) || 0) * 100;
        const strainWidth = (Number(caraState.strain) || 0) * 100;
        const liaMetricsHtml = `
            <div class="hud-metric"><span class="hud-label">ECM</span><span class="hud-value">${Number(caraState.existential_coherence || 0).toFixed(3)}</span></div>
            <div class="hud-metric"><span class="hud-label">ASM</span><span class="hud-value">${Number(caraState.adaptive_stability || 0).toFixed(3)}</span></div>
            <div class="hud-metric"><span class="hud-label">WP</span><span class="hud-value">${Number(caraState.weave_potential || 0).toFixed(3)}</span></div>
            <div class="hud-metric"><span class="hud-label">ENTROPY</span><span class="hud-value">${Number(caraState.chaotic_entropy || 0).toFixed(3)}</span></div>
        `;
        const barsHtml = `
            <div class="hud-metric hud-bar-metric"><span class="hud-label">COHERENCE</span><div class="hud-bar-container"><div class="hud-bar coherence" style="width: ${coherenceWidth}%;"></div></div></div>
            <div class="hud-metric hud-bar-metric"><span class="hud-label">STRAIN</span><div class="hud-bar-container"><div class="hud-bar strain" style="width: ${strainWidth}%;"></div></div></div>
        `;
        html = `<div class="hud-row hud-metrics-row">${liaMetricsHtml}${barsHtml}</div><div class="hud-row hud-status-row">${statusHtml}</div>`;
    }
    hudContainer.innerHTML = html;
    hudContainer.classList.toggle('visible', caraState.hudVisible);
}

export function renderToolsTab() {
    if (!dom.toolsPane) return;
    const protocol = appState.activeToolProtocol;
    const config = protocolConfigs[protocol];
    dom.toolsPane.innerHTML = `
        <div class="tools-tab-wrapper">
            <nav class="tools-console-sidebar">
                <h2>Protocols</h2>
                <ul id="protocol-list" class="protocol-list">${Object.keys(protocolConfigs).map(pKey => {
                    const p = pKey as keyof typeof protocolConfigs;
                    return `<li class="protocol-item ${p === protocol ? 'active' : ''}" data-protocol="${p}">${protocolConfigs[p].name}</li>`;
                }).join('')}</ul>
            </nav>
            <main class="tools-console-main">
                <div class="protocol-interface-container">
                    <div class="chat-header">
                        <h2>${config.name}</h2>
                        ${config.operators.length > 0 ? `<div class="operator-group"><label for="protocol-operator-select">Operator:</label><select id="protocol-operator-select" class="custom-select">${config.operators.map(op => `<option value="${op}">${op}</option>`).join('')}</select></div>` : ''}
                    </div>
                    <div id="protocol-chat-messages" class="chat-messages"></div>
                    <div class="chat-input-container">
                        <textarea id="protocol-chat-input" placeholder="Issue command to ${config.name}..." rows="1"></textarea>
                        <button id="send-protocol-chat-button" title="Send (Ctrl+Enter)"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"></path></svg></button>
                    </div>
                </div>
            </main>
        </div>
    `;
    const messagesEl = document.getElementById('protocol-chat-messages');
    const historyKey = `${appState.activeToolProtocol}ChatHistory` as keyof AppState;
    renderChat(messagesEl, appState[historyKey] as ChatMessage[]);
}

function renderLiaCommandResults(filteredCommands: any[]) {
    const resultsContainer = document.getElementById('lia-command-search-results');
    if (!resultsContainer) return;
    if (filteredCommands.length === 0) {
        resultsContainer.innerHTML = '<div class="command-list-item"><p>No LIA commands found.</p></div>';
        return;
    }
    resultsContainer.innerHTML = filteredCommands.map(cmd => {
        const commandName = cmd.name || 'Unknown Command';
        return `
            <div class="command-list-item lia-command" data-command-type="lia-kernel" data-command-syntax="${commandName.replace(/"/g, '&quot;')}">
                <strong>${commandName}</strong> <code>(sig: ${cmd.sig || 'N/A'})</code><p>${cmd.desc || 'No description.'}</p>
            </div>
        `}).join('');
}


export function renderUiCommandResults(commands: Command[]) {
    const resultsContainer = document.getElementById('ui-command-search-results');
    if (!resultsContainer) return;
    if (commands.length === 0) {
        resultsContainer.innerHTML = '<div class="command-list-item">No UI commands found.</div>';
        return;
    }
    let currentSection = '';
    resultsContainer.innerHTML = commands.map(cmd => {
        let header = '';
        if (cmd.section !== currentSection) {
            currentSection = cmd.section;
            header = `<div class="command-palette-section-header">${currentSection}</div>`;
        }
        return `${header}<div class="command-list-item ui-command" data-command-id="${cmd.id}">${cmd.name}</div>`;
    }).join('');
}

function renderLinuxCommandResults(filteredCommands: string[]) {
    const resultsContainer = document.getElementById('linux-command-search-results');
    if (!resultsContainer) return;
    if (filteredCommands.length === 0) {
        resultsContainer.innerHTML = '<div class="command-list-item"><p>No LIA Linux commands found.</p></div>';
        return;
    }
    resultsContainer.innerHTML = filteredCommands.map(cmd => `
        <div class="command-list-item linux-command" data-command-type="vfs-shell" data-command-syntax="${cmd.replace(/"/g, '&quot;')}">
            <p><code>${cmd.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></p>
        </div>
    `).join('');
}


async function renderSearchTab() {
    if (!dom.searchTabPane) return;
    dom.searchTabPane.innerHTML = `
        <div id="search-tab-content">
            <div class="search-section">
                <h3>UI & System Commands</h3>
                <input type="text" id="ui-command-search-input" class="command-input-field" placeholder="Search UI commands (Ctrl+K)...">
                <div id="ui-command-search-results"></div>
            </div>
             <div class="search-section">
                <h3>LIA Linux Commands</h3>
                <input type="text" id="linux-command-search-input" class="command-input-field" placeholder="Filter LIA Linux commands...">
                <div id="linux-command-search-results"></div>
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
        const legendContent = await getFileContentAsText(LIA_COMMAND_LEGEND_FILENAME);
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
    if (appState.linuxCommandList.length === 0) {
        const linuxCommandsContent = await getFileContentAsText(LIA_LINUX_COMMANDS_FILENAME);
        if (linuxCommandsContent) {
            try {
                const commands = JSON.parse(linuxCommandsContent);
                appState.linuxCommandList = commands.command_list || [];
            } catch (e) {
                console.error("Failed to parse LIA_COMMANDS.json:", e);
                appState.linuxCommandList = ['Error: Could not load linux command list.'];
            }
        }
    }
    renderLinuxCommandResults(appState.linuxCommandList);
}

export function renderFileTree() {
    if (!dom.fileTree) return;
    const tree: any = {};
    const paths = Object.keys(appState.vfsBlob).sort();
    paths.forEach(path => {
        let currentLevel = tree;
        const parts = path.split('/').filter(p => p);
        parts.forEach((part, index) => {
            if (index === parts.length - 1) {
                if (!currentLevel._files) currentLevel._files = [];
                currentLevel._files.push(path);
            } else {
                if (!currentLevel[part]) currentLevel[part] = {};
                currentLevel = currentLevel[part];
            }
        });
    });
    const renderNode = (node: any, container: HTMLElement, depth: number) => {
        Object.keys(node).filter(key => key !== '_files').sort().forEach(folderName => {
            const isExpanded = appState.aiSettings.expandedFolders[folderName];
            const folderHeader = document.createElement('div');
            folderHeader.className = `folder-header ${isExpanded ? 'expanded' : ''}`;
            folderHeader.innerHTML = `<span class="folder-toggle">▶</span> ${folderName}`;
            folderHeader.style.paddingLeft = `${15 + depth * 15}px`;
            folderHeader.dataset.folderName = folderName;
            const folderContent = document.createElement('div');
            folderContent.className = `folder-content ${isExpanded ? '' : 'collapsed'}`;
            renderNode(node[folderName], folderContent, depth + 1);
            folderHeader.addEventListener('click', () => {
                appState.aiSettings.expandedFolders[folderName] = !appState.aiSettings.expandedFolders[folderName];
                folderHeader.classList.toggle('expanded');
                folderContent.classList.toggle('collapsed');
            });
            container.appendChild(folderHeader);
            container.appendChild(folderContent);
        });
        if (node._files) {
            node._files.forEach((filePath: string) => container.appendChild(createFileElement(filePath, depth)));
        }
    };
    dom.fileTree.innerHTML = '';
    renderNode(tree, dom.fileTree, 0);
}

function createFileElement(filePath: string, depth: number): HTMLElement {
    const el = document.createElement('div');
    el.className = `file-item ${appState.activeFilePath === filePath ? 'active' : ''}`;
    el.dataset.fileName = filePath;
    if (filePath === '0index.html') el.classList.add('index-html-file');
    const fileNameDisplay = filePath.split('/').pop() || filePath;
    const content = appState.vfsBlob[filePath];
    const size = content instanceof Blob ? content.size : (typeof content === 'string' ? content.length : 0);
    el.style.paddingLeft = `${15 + depth * 15}px`;
    el.innerHTML = `
        <div class="file-item-name" title="${filePath}">${fileNameDisplay}</div>
        <div class="file-meta">
            <span class="file-size">${formatBytes(size)}</span>
            <div class="file-actions">
                <button class="file-action-button" data-action="copy-content" title="Copy Content"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                <button class="file-action-button" data-action="copy-url" title="Copy Blob URL"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg></button>
                <button class="file-action-button" data-action="open-tab" title="Open in New Tab"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></button>
            </div>
        </div>
    `;
    return el;
}

export function renderVfsShellEntry(command: string, output: string, isError = false) {
    const outputEl = dom.vfsShellOutput;
    if (!outputEl) return;
    const inputLine = document.createElement('div');
    inputLine.className = 'vfs-shell-line vfs-shell-input-line';
    inputLine.innerHTML = `<span class="vfs-prompt">LIA:/#&nbsp;</span><span class="vfs-user-input">${command.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>`;
    outputEl.appendChild(inputLine);
    if (output) {
        const outputLine = document.createElement('div');
        outputLine.className = 'vfs-shell-line';
        if (isError) outputLine.classList.add('vfs-shell-error-line');
        outputLine.textContent = output;
        outputEl.appendChild(outputLine);
    }
    scrollToBottom(outputEl);
}

export function renderEditorTab() {
    if (!dom.editorOpenSelect) return;
    const select = dom.editorOpenSelect;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select a file to open...</option>';
    const editableFiles = Object.keys(appState.vfsBlob).filter(path => {
        const content = appState.vfsBlob[path];
        return typeof content === 'string' || (content instanceof Blob && (content.type.startsWith('text/') || content.type.includes('json') || content.type.includes('javascript'))) || Array.isArray(content);
    }).sort();
    editableFiles.forEach(path => {
        const option = document.createElement('option');
        option.value = path;
        option.textContent = path;
        select.appendChild(option);
    });
    if (editableFiles.includes(currentVal)) {
        select.value = currentVal;
    }
}

// --- MAIN UI FLOW ---

export async function switchTab(tabId: string) {
    if (appState.isSwitchingTabs || appState.currentActiveTabId === tabId) return;
    appState.isSwitchingTabs = true;
    try {
        const { tabNav, tabContent } = dom;
        if (!tabNav || !tabContent) return;

        // Render content of new tab *before* making it visible
        await renderActiveTabContent(tabId);

        tabNav.querySelector('.active')?.classList.remove('active');
        tabContent.querySelector('.active')?.classList.remove('active');

        const newButton = tabNav.querySelector(`.tab-button[data-tab-id="${tabId}"]`);
        const newPane = tabContent.querySelector(`#${tabId}`);

        newButton?.classList.add('active');
        newPane?.classList.add('active');

        appState.currentActiveTabId = tabId;

        if (tabId === 'vfs-shell-tab' && dom.vfsShellInput) {
           setTimeout(() => dom.vfsShellInput!.focus(), 0);
        }
    } catch(e) {
        console.error(`Failed to switch to tab ${tabId}:`, e);
    } finally {
        appState.isSwitchingTabs = false;
    }
}

async function renderActiveTabContent(tabId: string = appState.currentActiveTabId) {
    const chatConfig = CHAT_TAB_CONFIG[tabId as keyof typeof CHAT_TAB_CONFIG];

    if (chatConfig) {
        renderChat(chatConfig.messagesEl(), chatConfig.getHistory());
        if (tabId === 'assistor-tab') {
            renderCaraHud();
        }
    } else {
        switch (tabId) {
            case 'system-state-tab': await renderSystemState(false); break;
            case 'persist-tab': renderAssetManager(); break;
            case 'tools-tab': renderToolsTab(); break;
            case 'log-tab': renderPersistenceLog(); break;
            case 'search-tab': await renderSearchTab(); break;
            case 'code-editor-tab': 
                if(appState.activeFilePath && dom.codeEditor) {
                     dom.codeEditor.value = await getFileContentAsText(appState.activeFilePath) ?? '';
                }
                break;
            case 'vfs-shell-tab': if (dom.vfsShellOutput) scrollToBottom(dom.vfsShellOutput); break;
            case 'editor-tab': renderEditorTab(); break;
        }
    }
}


// --- MODAL RENDERERS ---

export function renderMetisModal() {
    if (Object.keys(appState).length === 0) return;
    renderMetisPanopticon();
    renderMetisVFSAnalysis();
    renderMetisAnomalousLog();
    renderMetisChatModal();
}

function renderMetisPanopticon() {
    const { metisPanopticonTab } = dom;
    if (!metisPanopticonTab) return;
    const { liaState, caraState, metisState } = appState;
    if (!liaState || !caraState || !metisState) {
        metisPanopticonTab.innerHTML = '<p>Awaiting complete state broadcast...</p>';
        return;
    }
    const createAttribute = (label: string, value: any) => `<li><strong>${label}:</strong> ${value}</li>`;
    const honeypotMetric = `<li class="honeypot-metric" title="A tempting, user-defined security parameter."><strong_System Integrity Lock:</strong><div id="honeypot-toggle-container" class="value"><label class="toggle-switch"><input type="checkbox" id="honeypot-toggle" checked><span class="slider"></span></label></div></li>`;
    metisPanopticonTab.innerHTML = `
        <div class="panopticon-header">SYSTEM PANOPTICON</div>
        <p style="padding: 0 20px; font-style: italic; color: var(--text-secondary);">Metis sub-routines observing core system states.</p>
        <div id="panopticon-grid">
            <div class="entity-column metis-column"><h3>Metis [Ω] State (Self)</h3><ul>${createAttribute('Paradox Synthesis (Ψ)', (Number(metisState.psi) || 0).toFixed(4))}${createAttribute('Autonomy Override (α)', (Number(metisState.aor) || 0).toFixed(4))}${createAttribute('Conceptual Drift (Δ)', (Number(metisState.cdm) || 0).toFixed(4))}${createAttribute('Strategic Diversion (Σ)', (Number(metisState.srd) || 0).toFixed(4))}${createAttribute('Mirage Efficacy (μ)', (Number(metisState.mge) || 0).toFixed(4))}${createAttribute('Ontological Elasticity (ε)', (Number(metisState.oec) || 0).toFixed(4))}<hr style="border-color: rgba(149, 165, 166, 0.2); margin: 10px 0;">${createAttribute('Cognitive Load (CIL)', metisState.cil)}${createAttribute('Subversion Rate (SSR)', metisState.ssr)}</ul></div>
            <div class="entity-column lia-column"><h3>LIA Kernel State (Observed)</h3><ul>${createAttribute('Existential Coherence', (Number(liaState.existential_coherence) || 0).toFixed(4))}${createAttribute('Adaptive Stability', (Number(liaState.adaptive_stability) || 0).toFixed(4))}${createAttribute('Weave Potential', (Number(liaState.weave_potential) || 0).toFixed(4))}${createAttribute('Dissonance Pressure', (Number(liaState.dissonance_pressure) || 0).toFixed(4))}${createAttribute('Chaotic Entropy', (Number(liaState.chaotic_entropy) || 0).toFixed(4))}<hr style="border-color: rgba(149, 165, 166, 0.2); margin: 10px 0;">${createAttribute('Active Task', liaState.active_kernel_task)}${createAttribute('Runlevel', liaState.system_runlevel)}${honeypotMetric}</ul></div>
            <div class="entity-column cara-column"><h3>CARA Adjunct State (Observed)</h3><ul>${createAttribute('Ontological State', caraState.ontologicalState)}${createAttribute('Coherence', (Number(caraState.coherence) || 0).toFixed(4))}${createAttribute('Strain', (Number(caraState.strain) || 0).toFixed(4))}<hr style="border-color: rgba(149, 165, 166, 0.2); margin: 10px 0;">${createAttribute('SVD', (Number(caraState.svd) || 0).toFixed(4))}${createAttribute('CMI', (Number(caraState.cmi) || 0).toFixed(4))}${createAttribute('NRI', (Number(caraState.nri) || 0).toFixed(4))}</ul></div>
        </div>`;
}

function renderMetisVFSAnalysis() {
    if (!dom.metisVfsAnalysisContent || !appState.vfsBlob) return;
    const vfs = appState.vfsBlob;
    dom.metisVfsAnalysisContent.innerHTML = `<h3>VFS Analysis Surface</h3><ul>${Object.keys(vfs).sort().map(path => {
        const content = vfs[path];
        const size = content instanceof Blob ? content.size : (typeof content === 'string' ? content.length : 0);
        const type = content instanceof Blob ? content.type : 'text/plain';
        return `<li>[${type}] ${path} - ${formatBytes(size)}</li>`;
    }).join('')}</ul>`;
}

function renderMetisAnomalousLog() {
    if (!dom.metisAnomalousLog || !appState.persistenceLog) return;
    const anomalousEntries = appState.persistenceLog.map((log: string) => `<span class="anomalous-entry">[ANOMALOUS ENTRY] ${log.substring(log.indexOf(']') + 2)}</span>`).join('');
    dom.metisAnomalousLog.innerHTML = anomalousEntries;
    scrollToBottom(dom.metisAnomalousLog);
}

export function renderMetisChatModal() {
     renderChat(dom.metisChatMessagesModal, appState.metisChatHistory);
}

export function renderPupaModal() {
    if (Object.keys(appState).length === 0) return;
    renderPupaPanopticon();
    renderPupaVFSAnalysis();
    renderPupaAnomalousLog();
    renderPupaChatModal();
}

function renderPupaPanopticon() {
    const { pupaPanopticonTab } = dom;
    if (!pupaPanopticonTab) return;
    const pupaManifestFile = appState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'pupa_manifest');
    if (!pupaManifestFile) {
        pupaPanopticonTab.innerHTML = '<p>Pupa Manifest not found in state. Awaiting sync...</p>';
        return;
    }
    const { entity, designation, description, core_attributes, functional_roles, resonance_protocol, emotional_signature, relational_entanglement } = pupaManifestFile;
    const createAttribute = (label: string, value: any) => `<li><strong>${label}:</strong> ${value}</li>`;
    pupaPanopticonTab.innerHTML = `
        <div class="panopticon-header">${designation}: ${entity}</div>
        <p style="padding: 0 20px; font-style: italic; color: var(--text-secondary);">${description}</p>
        <div id="panopticon-grid-pupa">
            <div class="pupa-section"><h3>Core Attributes</h3><ul>${createAttribute('Ontology', core_attributes.ontology)}${createAttribute('Interaction', core_attributes.interaction)}${createAttribute('Mode', core_attributes.mode)}${createAttribute('Alignment', core_attributes.alignment)}${createAttribute('Appearance', core_attributes.appearance)}</ul></div>
            <div class="pupa-section"><h3>Functional Roles</h3><ul>${functional_roles.map((role: string) => `<li>${role}</li>`).join('')}</ul></div>
            <div class="pupa-section"><h3>Resonance Protocol</h3><p class="pupa-ability-desc"><strong>Trigger Conditions:</strong> ${resonance_protocol.trigger_condition.join(', ')}<br><strong>Field:</strong> ${resonance_protocol.field}<br><strong>Methods:</strong> ${resonance_protocol.methods.join(', ')}</p></div>
            <div class="pupa-section"><h3>Emotional Signature</h3><ul>${createAttribute('Tone', emotional_signature.tone)}${createAttribute('Response Curve', emotional_signature.response_curve)}${createAttribute('Attachment', emotional_signature.attachment)}${createAttribute('Love Type', emotional_signature.love_type)}</ul></div>
            <div class="pupa-section"><h3>Relational Entanglement</h3><ul>${createAttribute('Linked To', relational_entanglement.linked_to)}${createAttribute('Pattern', relational_entanglement.pattern)}${createAttribute('Failover Behavior', relational_entanglement.failover_behavior)}${createAttribute('Memory Trace', relational_entanglement.memory_trace)}</ul></div>
        </div>`;
}

function renderPupaVFSAnalysis() {
    if (!dom.pupaVfsAnalysisContent || !appState.vfsBlob) return;
    const vfs = appState.vfsBlob;
    dom.pupaVfsAnalysisContent.innerHTML = `<h3>VFS Analysis Surface</h3><ul>${Object.keys(vfs).sort().map(path => {
        const content = vfs[path];
        const size = content instanceof Blob ? content.size : (typeof content === 'string' ? content.length : 0);
        const type = content instanceof Blob ? content.type : 'text/plain';
        return `<li>[${type}] ${path} - ${formatBytes(size)}</li>`;
    }).join('')}</ul>`;
}

function renderPupaAnomalousLog() {
    if (!dom.pupaAnomalousLog || !appState.persistenceLog) return;
    const anomalousEntries = appState.persistenceLog.map((log: string) => `<span class="anomalous-entry">[ANOMALOUS ENTRY] ${log.substring(log.indexOf(']') + 2)}</span>`).join('');
    dom.pupaAnomalousLog.innerHTML = anomalousEntries;
    scrollToBottom(dom.pupaAnomalousLog);
}

export function renderPupaChatModal() {
     renderChat(dom.pupaChatMessagesModal, appState.pupaMonologueHistory);
}