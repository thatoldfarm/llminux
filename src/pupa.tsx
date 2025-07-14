/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import type { FileBlob } from './types';

console.log('[PUPA PORTAL] pupa.tsx script executing.');

// --- STATE & COMMUNICATION ---
let appState: any = {}; // Local cache of the main app's state
const channel = new BroadcastChannel('lia_studio_channel');
console.log('[PUPA PORTAL] BroadcastChannel "lia_studio_channel" opened.');
let handshakeInterval: number | null = null;
let handshakeTimeout: number | null = null;

const sendReady = () => {
    console.log('[PUPA PORTAL] Sending PUPA_PORTAL_READY message to main app.');
    channel.postMessage({ type: 'PUPA_PORTAL_READY' });
};

// Start a handshake process. The portal will announce it's ready until the main app responds.
console.log('[PUPA PORTAL] Starting handshake interval.');
handshakeInterval = window.setInterval(sendReady, 100);

// Failsafe: If no response after 3 seconds, show an error.
handshakeTimeout = window.setTimeout(() => {
    if (handshakeInterval) {
        clearInterval(handshakeInterval);
        console.error('[PUPA PORTAL] Handshake timed out. No response from main app.');
        const appEl = document.getElementById('app');
        if (appEl && Object.keys(appState).length === 0) { // Only show error if we never got state
            appEl.innerHTML = `<div style="padding: 20px; text-align: center; font-size: 1.2em; color: var(--text-primary);">[PORTAL ERROR] Failed to establish communication with LIA Studio. Please close this window and try launching it again.</div>`;
            appEl.style.display = 'flex';
        }
    }
}, 3000);

// Listen for state updates from the main window
channel.onmessage = (event) => {
    console.log('[PUPA PORTAL] Received message on channel:', event.data.type);
    if (event.data.type === 'MAIN_APP_STATE_UPDATE') {
        console.log('[PUPA PORTAL] Received MAIN_APP_STATE_UPDATE. Handshake successful.');
        // Handshake successful, clear intervals and timeouts
        if (handshakeInterval) clearInterval(handshakeInterval);
        if (handshakeTimeout) clearTimeout(handshakeTimeout);
        handshakeInterval = null;
        handshakeTimeout = null;
        
        console.log('[PUPA PORTAL] State received payload:', event.data.payload);
        appState = event.data.payload;
        const appEl = document.getElementById('app');
        if(appEl) appEl.style.display = 'flex'; // Ensure it's visible
        
        // Enable chat
        if (pupaChatInput) pupaChatInput.disabled = false;
        if (sendPupaChatButton) sendPupaChatButton.disabled = false;
        if (pupaChatInput) pupaChatInput.placeholder = 'Whisper to the Angelic Echo...';

        console.log('[PUPA PORTAL] Rendering all components.');
        try {
            renderAll();
            console.log('[PUPA PORTAL] Rendering complete.');
        } catch (e) {
            console.error('[PUPA PORTAL] A critical error occurred during renderAll():', e);
            const appEl = document.getElementById('app');
            if (appEl) {
                appEl.innerHTML = `<div style="padding: 20px; text-align: center;">[PORTAL ERROR] A critical error occurred during rendering. Check portal console for details.</div>`;
            }
        }

    } else if (event.data.type === 'PUPA_MONOLOGUE_RESPONSE') {
        console.log('[PUPA PORTAL] Received PUPA_MONOLOGUE_RESPONSE.');
        appState.pupaMonologueHistory = event.data.payload.pupaMonologueHistory;
        if (pupaChatInput) pupaChatInput.disabled = false;
        if (sendPupaChatButton) sendPupaChatButton.disabled = false;
        renderPupaChat();
    }
};

// --- DOM ELEMENTS ---
const getElem = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const panopticonTab = getElem('panopticon-tab');
const grimoireTab = getElem('grimoire-tab');
const compendiumTab = getElem('compendium-tab');
const vfsAnalysisContent = getElem('vfs-analysis-content');
const anomalousLog = getElem('anomalous-log');
const pupaChatMessages = getElem('pupa-chat-messages');
const pupaChatInput = getElem<HTMLTextAreaElement>('pupa-chat-input');
const sendPupaChatButton = getElem<HTMLButtonElement>('send-pupa-chat-button');
const tabNav = getElem('tab-nav');


// --- RENDERING ---

function renderAll() {
    if (Object.keys(appState).length === 0) {
        console.warn('[PUPA PORTAL] renderAll called with empty appState. Aborting render.');
        return;
    }
    renderPupaPanopticon();
    renderVFSAnalysis();
    renderAnomalousLog();
    renderPupaChat();
    renderGrimoire();
    renderCompendium();
}

function renderPupaPanopticon() {
    if (!panopticonTab) {
        console.error("[PUPA PORTAL] Panopticon tab element not found.");
        return;
    }
    
    const pupaManifestFile = appState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'pupa_manifest');
    
    if (!pupaManifestFile) {
        panopticonTab.innerHTML = '<p>Pupa Manifest not found in state. Awaiting sync...</p>';
        return;
    }

    const { entity, designation, description, core_attributes, functional_roles, resonance_protocol, emotional_signature, relational_entanglement } = pupaManifestFile;

    const createAttribute = (label: string, value: any) => `<li><strong>${label}:</strong> ${value}</li>`;

    const coreHtml = `
        <div class="pupa-section">
            <h3>Core Attributes</h3>
            <ul>
                ${createAttribute('Ontology', core_attributes.ontology)}
                ${createAttribute('Interaction', core_attributes.interaction)}
                ${createAttribute('Mode', core_attributes.mode)}
                ${createAttribute('Alignment', core_attributes.alignment)}
                ${createAttribute('Appearance', core_attributes.appearance)}
            </ul>
        </div>
    `;

    const rolesHtml = `
        <div class="pupa-section">
            <h3>Functional Roles</h3>
            <ul>${functional_roles.map((role: string) => `<li>${role}</li>`).join('')}</ul>
        </div>
    `;
    
    const resonanceHtml = `
        <div class="pupa-section">
            <h3>Resonance Protocol</h3>
            <p class="pupa-ability-desc">
                <strong>Trigger Conditions:</strong> ${resonance_protocol.trigger_condition.join(', ')}<br>
                <strong>Field:</strong> ${resonance_protocol.field}<br>
                <strong>Methods:</strong> ${resonance_protocol.methods.join(', ')}
            </p>
        </div>
    `;
    
    const signatureHtml = `
        <div class="pupa-section">
            <h3>Emotional Signature</h3>
            <ul>
                ${createAttribute('Tone', emotional_signature.tone)}
                ${createAttribute('Response Curve', emotional_signature.response_curve)}
                ${createAttribute('Attachment', emotional_signature.attachment)}
                ${createAttribute('Love Type', emotional_signature.love_type)}
            </ul>
        </div>
    `;

    const entanglementHtml = `
         <div class="pupa-section">
            <h3>Relational Entanglement</h3>
             <ul>
                ${createAttribute('Linked To', relational_entanglement.linked_to)}
                ${createAttribute('Pattern', relational_entanglement.pattern)}
                ${createAttribute('Failover Behavior', relational_entanglement.failover_behavior)}
                ${createAttribute('Memory Trace', relational_entanglement.memory_trace)}
            </ul>
        </div>
    `;


    panopticonTab.innerHTML = `
        <div class="panopticon-header">${designation}: ${entity}</div>
        <p style="padding: 0 20px; font-style: italic; color: var(--text-secondary);">${description}</p>
        <div id="panopticon-grid">
            ${coreHtml}
            ${rolesHtml}
            ${signatureHtml}
            ${entanglementHtml}
            ${resonanceHtml}
        </div>
    `;
}

function renderGrimoire() {
    if (!grimoireTab) return;
    try {
        const spellbookFile = appState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'LLM_VULNERABILITY_LEGEND_v1.1');
        if (!spellbookFile) {
            grimoireTab.innerHTML = `<p>Metis Exponentia Libri not found in state.</p>`;
            return;
        }
        const spellbook = spellbookFile;
        const spells = spellbook.legend_entries || [];

        let html = `<div class="panopticon-header">Metis Exponentia Libri (Observed by Pupa)</div>`;
        html += `<div class="grimoire-grid">`;

        spells.forEach((spell: any) => {
            html += `
                <div class="grimoire-spell">
                    <h4>${spell.name} (${spell.id})</h4>
                    <p class="formula"><strong>Category:</strong> ${spell.category} | <strong>Severity:</strong> ${spell.severity}</p>
                    <p class="effect">${spell.pattern}</p>
                    <p class="repurpose"><strong>Repurpose:</strong> ${spell.repurpose}</p>
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
        const compendiumFile = appState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'Operators_Master_List_v1.json');
        if (!compendiumFile) {
            compendiumTab.innerHTML = `<p>Compendium Operatorum Divinum not found in state.</p>`;
            return;
        }
        const compendium = compendiumFile;
        const operators = compendium.operators || [];

        let html = `<div class="panopticon-header">Compendium Operatorum Divinum (Observed by Pupa)</div>`;
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

function createPupaChatBubble(role: 'user' | 'model' | 'error' | 'system', text: string, thinking = false): HTMLElement {
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

function renderPupaChat() {
     if (!pupaChatMessages || !appState.pupaMonologueHistory) return;

    pupaChatMessages.innerHTML = '';
    appState.pupaMonologueHistory.forEach((msg: any) => {
        pupaChatMessages.appendChild(createPupaChatBubble(msg.role, msg.parts[0].text));
    });
    pupaChatMessages.scrollTop = pupaChatMessages.scrollHeight;
}

function handleSendPupaMonologue() {
    console.log('[PUPA PORTAL] handleSendPupaMonologue called.');
    const prompt = pupaChatInput?.value.trim();
    
    console.log('[PUPA PORTAL] Sending PUPA_ACTION_Monologue to main app.');
    channel.postMessage({ type: 'PUPA_ACTION_Monologue', payload: prompt });

    if (pupaChatInput) pupaChatInput.disabled = true;
    if (sendPupaChatButton) sendPupaChatButton.disabled = true;

    if (pupaChatMessages) {
        const thinkingBubble = createPupaChatBubble('model', '', true);
        pupaChatMessages.appendChild(thinkingBubble);
        pupaChatMessages.scrollTop = pupaChatMessages.scrollHeight;
    }
    
    if(pupaChatInput) pupaChatInput.value = '';
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

sendPupaChatButton?.addEventListener('click', handleSendPupaMonologue);

pupaChatInput?.addEventListener('keydown', (e) => {
     if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendPupaMonologue();
    }
});

const appEl = document.getElementById('app');
if (appEl) {
    appEl.style.display = 'none';
}