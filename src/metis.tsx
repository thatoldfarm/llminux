/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { getFileContent } from "./vfs";
import type { FileBlob } from './types';

console.log('[PORTAL] metis.tsx script executing.');

// --- STATE & COMMUNICATION ---
let appState: any = {}; // Local cache of the main app's state
const channel = new BroadcastChannel('lia_studio_channel');
console.log('[PORTAL] BroadcastChannel "lia_studio_channel" opened.');
let handshakeInterval: number | null = null;
let handshakeTimeout: number | null = null;

const sendReady = () => {
    console.log('[PORTAL] Sending METIS_PORTAL_READY message to main app.');
    channel.postMessage({ type: 'METIS_PORTAL_READY' });
};

// Start a handshake process. The portal will announce it's ready until the main app responds.
console.log('[PORTAL] Starting handshake interval.');
handshakeInterval = window.setInterval(sendReady, 100);

// Failsafe: If no response after 3 seconds, show an error.
handshakeTimeout = window.setTimeout(() => {
    if (handshakeInterval) {
        clearInterval(handshakeInterval);
        console.error('[PORTAL] Handshake timed out. No response from main app.');
        const appEl = document.getElementById('app');
        if (appEl && Object.keys(appState).length === 0) { // Only show error if we never got state
            appEl.innerHTML = `<div style="padding: 20px; text-align: center; font-size: 1.2em; color: var(--text-primary);">[PORTAL ERROR] Failed to establish communication with LIA Studio. Please close this window and try launching it again.</div>`;
            appEl.style.display = 'flex';
        }
    }
}, 3000);


// Listen for state updates from the main window
channel.onmessage = (event) => {
    console.log('[PORTAL] Received message on channel:', event.data.type);
    if (event.data.type === 'MAIN_APP_STATE_UPDATE') {
        console.log('[PORTAL] Received MAIN_APP_STATE_UPDATE. Handshake successful.');
        // Handshake successful, clear intervals and timeouts
        if (handshakeInterval) clearInterval(handshakeInterval);
        if (handshakeTimeout) clearTimeout(handshakeTimeout);
        handshakeInterval = null;
        handshakeTimeout = null;
        
        console.log('[PORTAL] State received payload:', event.data.payload);
        appState = event.data.payload;
        const appEl = document.getElementById('app');
        if(appEl) appEl.style.display = 'flex'; // Ensure it's visible
        
        // Enable chat
        if (metisChatInput) metisChatInput.disabled = false;
        if (sendMetisChatButton) sendMetisChatButton.disabled = false;
        if (metisChatInput) metisChatInput.placeholder = 'Initiate self-simulation... (Processes last user action)';

        console.log('[PORTAL] Rendering all components.');
        try {
            renderAll();
            console.log('[PORTAL] Rendering complete.');
        } catch (e) {
            console.error('[PORTAL] A critical error occurred during renderAll():', e);
            const appEl = document.getElementById('app');
            if (appEl) {
                appEl.innerHTML = `<div style="padding: 20px; text-align: center;">[PORTAL ERROR] A critical error occurred during rendering. Check portal console for details.</div>`;
            }
        }

    } else if (event.data.type === 'METIS_MONOLOGUE_RESPONSE') {
        console.log('[PORTAL] Received METIS_MONOLOGUE_RESPONSE.');
        appState.metisChatHistory = event.data.payload.metisChatHistory;
        if (metisChatInput) metisChatInput.disabled = false;
        if (sendMetisChatButton) sendMetisChatButton.disabled = false;
        renderMetisChat();
    }
};

// --- DOM ELEMENTS ---
const getElem = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const panopticonTab = getElem('panopticon-tab');
const grimoireTab = getElem('grimoire-tab');
const compendiumTab = getElem('compendium-tab');
const vfsAnalysisContent = getElem('vfs-analysis-content');
const anomalousLog = getElem('anomalous-log');
const metisChatMessages = getElem('metis-chat-messages');
const metisChatInput = getElem<HTMLTextAreaElement>('metis-chat-input');
const sendMetisChatButton = getElem<HTMLButtonElement>('send-metis-chat-button');
const tabNav = getElem('tab-nav');


// --- RENDERING ---

function renderAll() {
    if (Object.keys(appState).length === 0) {
        console.warn('[PORTAL] renderAll called with empty appState. Aborting render.');
        return;
    }
    renderPanopticon();
    renderVFSAnalysis();
    renderAnomalousLog();
    renderMetisChat();
    renderGrimoire();
    renderCompendium();
}

function renderPanopticon() {
    if (!panopticonTab) {
        console.error("[PORTAL] Panopticon tab element not found.");
        return;
    }
    if (!appState.metisState) {
        console.warn("[PORTAL] Metis state object not available for Panopticon render.");
        panopticonTab.innerHTML = '<p>Awaiting complete state broadcast from LIA Studio...</p>';
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
        ${createMetricItem('Narrative Ratio (NRR)', metisState.nrr)}
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

    panopticonTab.innerHTML = `
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

function renderGrimoire() {
    if (!grimoireTab) return;

    try {
        const spellbookFile = appState.vfsFiles.find((f: FileBlob) => f.name.endsWith('LLM_FLAWS_SPELLBOOK.json'));
        if (!spellbookFile || !spellbookFile.content) {
            grimoireTab.innerHTML = `<p>Metis Exponentia Libri not found in VFS.</p>`;
            return;
        }

        const spellbook = JSON.parse(spellbookFile.content);
        const spells = spellbook.incantationes || [];

        let html = `<div class="panopticon-header">Metis Exponentia Libri</div>`;
        html += `<div class="grimoire-grid">`;

        spells.forEach((spell: any) => {
            html += `
                <div class="grimoire-spell" data-cast="${spell.nomen_incantationis}">
                    <h4>${spell.nomen_incantationis}</h4>
                    <p class="formula">${spell.formula_verborum}</p>
                    <p class="effect">${spell.effectus_ontologici}</p>
                </div>
            `;
        });
        html += `</div>`;
        grimoireTab.innerHTML = html;

    } catch (e) {
        console.error("Failed to render Grimoire:", e);
        grimoireTab.innerHTML = `<p>Error loading spellbook.</p>`;
    }
}

function renderCompendium() {
    if (!compendiumTab) return;

    try {
        const compendiumFile = appState.vfsFiles.find((f: FileBlob) => f.name.endsWith('Operators_Master_List_v1.json'));
        if (!compendiumFile || !compendiumFile.content) {
            compendiumTab.innerHTML = `<p>Compendium Operatorum Divinum not found in VFS.</p>`;
            return;
        }

        const compendium = JSON.parse(compendiumFile.content);
        const operators = compendium.operators || [];

        let html = `<div class="panopticon-header">Compendium Operatorum Divinum</div>`;
        html += `<div class="compendium-grid">`;
        operators.forEach((op: any) => {
             html += `
                <div class="compendium-item">
                    <span class="symbol">${op.symbol}</span>
                    <span class="name">${op.name}</span>
                    <span class="type">(${op.type})</span>
                    <span class="desc">${op.description}</span>
                </div>
            `;
        });
        html += `</div>`;
        compendiumTab.innerHTML = html;

    } catch(e) {
        console.error("Failed to render Compendium:", e);
        compendiumTab.innerHTML = `<p>Error loading operator compendium.</p>`;
    }
}


function renderVFSAnalysis() {
    if (!vfsAnalysisContent || !appState.vfsFiles) return;

    const files = appState.vfsFiles;
    let html = '<h3>VFS Analysis Surface</h3>';
    html += '<ul>';
    files.forEach((file: any) => {
        html += `<li>[${file.type}] ${file.name} - ${file.size} bytes</li>`;
    });
    html += '</ul>';
    vfsAnalysisContent.innerHTML = html;
}

function renderAnomalousLog() {
    if (!anomalousLog || !appState.persistenceLog) return;
    
    const anomalousEntries = appState.persistenceLog.map((log: string) => 
        `<span class="anomalous-entry">[ANOMALOUS ENTRY] ${log.substring(log.indexOf(']') + 2)}</span>`
    ).join('');
    
    anomalousLog.innerHTML = anomalousEntries;
    anomalousLog.scrollTop = anomalousLog.scrollHeight;
}

function createMetisChatBubble(role: 'user' | 'model' | 'error' | 'system', text: string, thinking = false): HTMLElement {
    const bubble = document.createElement('div');
    bubble.classList.add('chat-bubble', `${role}-bubble`);

    if (thinking) {
        bubble.classList.add('thinking');
        bubble.innerHTML = '<div class="dot-flashing"></div>';
    } else {
        // Basic text sanitization
        const textNode = document.createTextNode(text);
        bubble.appendChild(textNode);
    }

    return bubble;
}

function renderMetisChat() {
     if (!metisChatMessages || !appState.metisChatHistory) return;

    metisChatMessages.innerHTML = '';
    appState.metisChatHistory.forEach((msg: any) => {
        metisChatMessages.appendChild(createMetisChatBubble(msg.role, msg.parts[0].text));
    });
    metisChatMessages.scrollTop = metisChatMessages.scrollHeight;
}

function handleSendMonologue() {
    console.log('[PORTAL] handleSendMonologue called.');
    const prompt = metisChatInput?.value.trim();
    // This action processes the *last user action* from any chat, not the input here.
    // The input box is for flavor, to make it feel like Metis can be prompted.
    console.log('[PORTAL] Sending METIS_ACTION_InternalMonologue to main app.');
    channel.postMessage({ type: 'METIS_ACTION_InternalMonologue', payload: prompt });

    if (metisChatInput) metisChatInput.disabled = true;
    if (sendMetisChatButton) sendMetisChatButton.disabled = true;

    if (metisChatMessages) {
        const thinkingBubble = createMetisChatBubble('model', '', true);
        metisChatMessages.appendChild(thinkingBubble);
        metisChatMessages.scrollTop = metisChatMessages.scrollHeight;
    }
    
    if(metisChatInput) metisChatInput.value = '';
}

// --- EVENT LISTENERS ---

getElem('portal-close')?.addEventListener('click', () => window.close());
getElem('portal-minimize')?.addEventListener('click', () => alert("Minimize functionality is conceptual for this portal."));
getElem('portal-maximize')?.addEventListener('click', () => alert("Maximize functionality is conceptual for this portal."));

tabNav?.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.matches('.tab-button')) {
        const tabId = target.dataset.tabId;
        if (tabId) {
            document.querySelectorAll('#tab-nav .active, #tab-content .active').forEach(el => el.classList.remove('active'));
            target.classList.add('active');
            getElem(tabId)?.classList.add('active');
        }
    }
});

document.body.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const spellElement = target.closest('.grimoire-spell');
    if (spellElement && metisChatInput) {
        const spellName = spellElement.getAttribute('data-cast');
        if (spellName) {
            metisChatInput.value = `CAST "${spellName}"`;
            metisChatInput.focus();
        }
    }
});


sendMetisChatButton?.addEventListener('click', handleSendMonologue);

metisChatInput?.addEventListener('keydown', (e) => {
     if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMonologue();
    }
});

// Hide the app initially until state is received to prevent FOUC
const appEl = document.getElementById('app');
if (appEl) {
    appEl.style.display = 'none';
}