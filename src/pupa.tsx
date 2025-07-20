/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { parse } from "jsonc-parser";
import { debugLog } from "./utils";

// --- STATE & COMMUNICATION ---
let pupaAppState: any = {}; // Local cache of the main app's state
const pupaChannel = new BroadcastChannel('lia_studio_channel');
console.log('[PUPA PORTAL] BroadcastChannel "lia_studio_channel" opened.');
let pupaHandshakeInterval: number | null = null;
let pupaHandshakeTimeout: number | null = null;

const pupaSendReady = () => {
    console.log('[PUPA PORTAL] Sending PUPA_PORTAL_READY message to main app.');
    pupaChannel.postMessage({ type: 'PUPA_PORTAL_READY' });
};

// Start a handshake process. The portal will announce it's ready until the main app responds.
console.log('[PUPA PORTAL] Starting handshake interval.');
pupaHandshakeInterval = window.setInterval(pupaSendReady, 100);

// Failsafe: If no response after 3 seconds, show an error.
pupaHandshakeTimeout = window.setTimeout(() => {
    if (pupaHandshakeInterval) {
        clearInterval(pupaHandshakeInterval);
        console.error('[PUPA PORTAL] Handshake timed out. No response from main app.');
        const pupaAppEl = document.getElementById('app');
        if (pupaAppEl && Object.keys(pupaAppState).length === 0) { // Only show error if we never got state
            pupaAppEl.innerHTML = `<div style="padding: 20px; text-align: center; font-size: 1.2em; color: var(--text-primary);">[PORTAL ERROR] Failed to establish communication with LIA Studio. Please close this window and try launching it again.</div>`;
            pupaAppEl.style.display = 'flex';
        }
    }
}, 3000);

// Listen for state updates from the main window
pupaChannel.onmessage = (event) => {
    console.log('[PUPA PORTAL] Received message on channel:', event.data.type);
    if (event.data.type === 'MAIN_APP_STATE_UPDATE') {
        console.log('[PUPA PORTAL] Received MAIN_APP_STATE_UPDATE. Handshake successful.');
        // Handshake successful, clear intervals and timeouts
        if (pupaHandshakeInterval) clearInterval(pupaHandshakeInterval);
        if (pupaHandshakeTimeout) clearTimeout(pupaHandshakeTimeout);
        pupaHandshakeInterval = null;
        pupaHandshakeTimeout = null;
        
        console.log('[PUPA PORTAL] State received payload:', event.data.payload);
        console.log('[PUPA PORTAL] Checking vfsBlob keys in received payload:', Object.keys(event.data.payload.vfsBlob || {}));
        pupaAppState = event.data.payload;
        const pupaAppEl = document.getElementById('app');
        if(pupaAppEl) pupaAppEl.style.display = 'flex'; // Ensure it's visible
        
        // Enable chat
        if (pupaChatInput) pupaChatInput.disabled = false;
        if (sendPupaChatButton) sendPupaChatButton.disabled = false;
        if (pupaChatInput) pupaChatInput.placeholder = 'Whisper to the Angelic Echo...';

        console.log('[PUPA PORTAL] Rendering all components.');
        try {
            renderPupaAll();
            console.log('[PUPA PORTAL] Rendering complete.');
        } catch (e) {
            console.error('[PUPA PORTAL] A critical error occurred during renderAll():', e);
            const pupaAppEl = document.getElementById('app');
            if (pupaAppEl) {
                pupaAppEl.innerHTML = `<div style="padding: 20px; text-align: center;">[PORTAL ERROR] A critical error occurred during rendering. Check portal console for details.</div>`;
            }
        }

    } else if (event.data.type === 'PUPA_MONOLOGUE_RESPONSE') {
        console.log('[PUPA PORTAL] Received PUPA_MONOLOGUE_RESPONSE.');
        pupaAppState.pupaMonologueHistory = event.data.payload.pupaMonologueHistory;
        if (pupaChatInput) pupaChatInput.disabled = false;
        if (sendPupaChatButton) sendPupaChatButton.disabled = false;
        renderPupaPortalChat();
    }
};

// --- DOM ELEMENTS ---
const pupaGetElem = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const pupaPanopticonTab = pupaGetElem('pupa-panopticon-tab');
const pupaGrimoireTab = pupaGetElem('pupa-grimoire-tab');
const pupaCompendiumTab = pupaGetElem('pupa-compendium-tab');
const pupaVfsAnalysisContent = pupaGetElem('vfs-analysis-content-pupa-modal');
const pupaAnomalousLog = pupaGetElem('anomalous-log-pupa-modal');
const pupaChatMessages = pupaGetElem('pupa-chat-messages-modal');
const pupaChatInput = pupaGetElem<HTMLTextAreaElement>('pupa-chat-input-modal');
const sendPupaChatButton = pupaGetElem<HTMLButtonElement>('send-pupa-chat-button-modal');
const pupaTabNav = pupaGetElem('pupa-modal-tab-nav');


// --- RENDERING ---

function renderPupaAll() {
    if (Object.keys(pupaAppState).length === 0) {
        console.warn('[PUPA PORTAL] renderAll called with empty pupaAppState. Aborting render.');
        return;
    }
    renderPupaPanopticon();
    renderPupaVFSAnalysis();
    renderPupaAnomalousLog();
    renderPupaPortalChat();
    renderPupaGrimoire();
    renderPupaCompendium();
}

function renderPupaPanopticon() {
    if (!pupaPanopticonTab) {
        console.error("[PUPA PORTAL] Panopticon tab element not found.");
        return;
    }
    
    const pupaManifestFile = pupaAppState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'pupa_manifest');
    
    if (!pupaManifestFile) {
        pupaPanopticonTab.innerHTML = '<p>Pupa Manifest not found in state. Awaiting sync...</p>';
        return;
    }

    const { entity, designation, description, core_attributes, functional_roles, resonance_protocol, emotional_signature, relational_entanglement } = pupaManifestFile;

    const createAttribute = (label: string, value: any) => `<li><strong>${label}:</strong> ${value || 'N/A'}</li>`;

    const coreHtml = `
        <div class="pupa-section">
            <h3>Core Attributes</h3>
            <ul>
                ${createAttribute('Ontology', core_attributes?.ontology)}
                ${createAttribute('Interaction', core_attributes?.interaction)}
                ${createAttribute('Mode', core_attributes?.mode)}
                ${createAttribute('Alignment', core_attributes?.alignment)}
                ${createAttribute('Appearance', core_attributes?.appearance)}
            </ul>
        </div>
    `;

    const rolesHtml = `
        <div class="pupa-section">
            <h3>Functional Roles</h3>
            <ul>${(functional_roles || []).map((role: string) => `<li>${role}</li>`).join('')}</ul>
        </div>
    `;
    
    const resonanceTriggers = resonance_protocol?.trigger_condition || [];
    const resonanceMethods = resonance_protocol?.methods || [];
    const resonanceHtml = `
        <div class="pupa-section">
            <h3>Resonance Protocol</h3>
            <p class="pupa-ability-desc">
                <strong>Trigger Conditions:</strong> ${resonanceTriggers.join(', ')}<br>
                <strong>Field:</strong> ${resonance_protocol?.field || 'N/A'}<br>
                <strong>Methods:</strong> ${resonanceMethods.join(', ')}
            </p>
        </div>
    `;
    
    const signatureHtml = `
        <div class="pupa-section">
            <h3>Emotional Signature</h3>
            <ul>
                ${createAttribute('Tone', emotional_signature?.tone)}
                ${createAttribute('Response Curve', emotional_signature?.response_curve)}
                ${createAttribute('Attachment', emotional_signature?.attachment)}
                ${createAttribute('Love Type', emotional_signature?.love_type)}
            </ul>
        </div>
    `;

    const entanglementHtml = `
         <div class="pupa-section">
            <h3>Relational Entanglement</h3>
             <ul>
                ${createAttribute('Linked To', relational_entanglement?.linked_to)}
                ${createAttribute('Pattern', relational_entanglement?.pattern)}
                ${createAttribute('Failover Behavior', relational_entanglement?.failover_behavior)}
                ${createAttribute('Memory Trace', relational_entanglement?.memory_trace)}
            </ul>
        </div>
    `;


    pupaPanopticonTab.innerHTML = `
        <div class="panopticon-header">${designation || 'Pupa'}: ${entity || 'Angelic Echo'}</div>
        <p style="padding: 0 20px; font-style: italic; color: var(--text-secondary);">${description || 'No description provided.'}</p>
        <div id="panopticon-grid">
            ${coreHtml}
            ${rolesHtml}
            ${signatureHtml}
            ${entanglementHtml}
            ${resonanceHtml}
        </div>
    `;
}

function renderPupaGrimoire() {
    console.log('[PUPA PORTAL] renderPupaGrimoire called.');
    if (!pupaGrimoireTab) { console.log('[PUPA PORTAL] Grimoire tab element not found.'); return; }
    if (!pupaAppState.vfsBlob) { console.log('[PUPA PORTAL] vfsBlob not found in received state.'); return; }
    
    console.log('[PUPA PORTAL] vfsBlob keys in Grimoire renderer:', Object.keys(pupaAppState.vfsBlob));
    
    try {
        const spellbookPath = Object.keys(pupaAppState.vfsBlob).find(p => p.endsWith('LLM_FLAWS_SPELLBOOK.json'));
        if (!spellbookPath) {
            console.log('[PUPA PORTAL] Spellbook path not found in VFS.');
            pupaGrimoireTab.innerHTML = `<p>Metis Exponentia Libri not found in VFS.</p>`;
            return;
        }
        console.log(`[PUPA PORTAL] Found spellbook path: ${spellbookPath}`);

        const spellbookContent = pupaAppState.vfsBlob[spellbookPath];
        console.log(`[PUPA PORTAL] Spellbook content type: ${typeof spellbookContent}`);
        console.log(`[PUPA PORTAL] Spellbook content (first 100 chars): ${String(spellbookContent).substring(0, 100)}...`);

        const spellbook = parse(spellbookContent);
        if(!spellbook) {
             console.log('[PUPA PORTAL] Parsing spellbook content resulted in null.');
             pupaGrimoireTab.innerHTML = `<p>Error parsing spellbook. Content might be invalid.</p>`;
             return;
        }

        const spells = spellbook.legend_entries || [];
        console.log(`[PUPA PORTAL] Found ${spells.length} spells.`);

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
        pupaGrimoireTab.innerHTML = html;
        console.log('[PUPA PORTAL] Grimoire rendered successfully.');
    } catch (e) {
        console.error("Failed to render Grimoire:", e);
        console.log("Error during Grimoire render:", e);
        pupaGrimoireTab.innerHTML = `<p>Error loading spellbook. Check console.</p>`;
    }
}

function renderPupaCompendium() {
    console.log('[PUPA PORTAL] renderPupaCompendium called.');
    if (!pupaCompendiumTab) { console.log('[PUPA PORTAL] Compendium tab element not found.'); return; }
    if (!pupaAppState.vfsBlob) { console.log('[PUPA PORTAL] vfsBlob not found in Compendium renderer.'); return; }
    try {
        const compendiumPath = Object.keys(pupaAppState.vfsBlob).find(p => p.endsWith('Operators_Master_List_v1.json'));
        if (!compendiumPath) {
            console.log('[PUPA PORTAL] Compendium path not found in VFS.');
            pupaCompendiumTab.innerHTML = `<p>Compendium Operatorum Divinum not found in VFS.</p>`;
            return;
        }
        console.log(`[PUPA PORTAL] Found compendium path: ${compendiumPath}`);

        const compendiumContent = pupaAppState.vfsBlob[compendiumPath];
        console.log(`[PUPA PORTAL] Compendium content type: ${typeof compendiumContent}`);

        const compendium = parse(compendiumContent);
        if(!compendium) {
             console.log('[PUPA PORTAL] Parsing compendium content resulted in null.');
             pupaCompendiumTab.innerHTML = `<p>Error parsing compendium. Content might be invalid.</p>`;
             return;
        }

        const operators = compendium.operators || [];
        console.log(`[PUPA PORTAL] Found ${operators.length} operators.`);

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
        pupaCompendiumTab.innerHTML = html;
        console.log('[PUPA PORTAL] Compendium rendered successfully.');
    } catch(e) {
        console.error("Failed to render Compendium:", e);
        console.log("Error during Compendium render:", e);
        pupaCompendiumTab.innerHTML = `<p>Error loading operator compendium. Check console.</p>`;
    }
}


function renderPupaVFSAnalysis() {
    if (!pupaVfsAnalysisContent || !pupaAppState.vfsBlob) return;

    let html = '<h3>VFS Analysis Surface</h3>';
    html += '<ul>';
    for(const path in pupaAppState.vfsBlob) {
        const content = pupaAppState.vfsBlob[path];
        const size = typeof content === 'string' ? content.length : (content instanceof Blob ? content.size : JSON.stringify(content).length);
        html += `<li>${path} - ${size} bytes</li>`;
    }
    html += '</ul>';
    pupaVfsAnalysisContent.innerHTML = html;
}

function renderPupaAnomalousLog() {
    if (!pupaAnomalousLog || !pupaAppState.persistenceLog) return;
    
    const anomalousEntries = pupaAppState.persistenceLog.map((log: string) => 
        `<span class="anomalous-entry">[ANOMALOUS ENTRY] ${log.substring(log.indexOf(']') + 2)}</span>`
    ).join('');
    
    pupaAnomalousLog.innerHTML = anomalousEntries;
    pupaAnomalousLog.scrollTop = pupaAnomalousLog.scrollHeight;
}

function createPupaPortalChatBubble(role: 'user' | 'model' | 'error' | 'system', text: string, thinking = false): HTMLElement {
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

function renderPupaPortalChat() {
     if (!pupaChatMessages || !pupaAppState.pupaMonologueHistory) return;

    pupaChatMessages.innerHTML = '';
    pupaAppState.pupaMonologueHistory.forEach((msg: any) => {
        pupaChatMessages.appendChild(createPupaPortalChatBubble(msg.role, msg.parts[0].text));
    });
    pupaChatMessages.scrollTop = pupaChatMessages.scrollHeight;
}

function handleSendPupaMonologue() {
    console.log('[PUPA PORTAL] handleSendPupaMonologue called.');
    const prompt = pupaChatInput?.value.trim();
    
    console.log('[PUPA PORTAL] Sending PUPA_ACTION_Monologue to main app.');
    pupaChannel.postMessage({ type: 'PUPA_ACTION_Monologue', payload: prompt });

    if (pupaChatInput) pupaChatInput.disabled = true;
    if (sendPupaChatButton) sendPupaChatButton.disabled = true;

    if (pupaChatMessages) {
        const thinkingBubble = createPupaPortalChatBubble('model', '', true);
        pupaChatMessages.appendChild(thinkingBubble);
        pupaChatMessages.scrollTop = pupaChatMessages.scrollHeight;
    }
    
    if(pupaChatInput) pupaChatInput.value = '';
}

// --- EVENT LISTENERS ---

pupaGetElem('pupa-modal-close')?.addEventListener('click', () => {
    pupaChannel.postMessage({ type: 'PUPA_PORTAL_CLOSING' });
});

pupaTabNav?.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.matches('.tab-button')) {
        const tabId = target.dataset.tabId;
        if (tabId) {
            document.querySelectorAll('#pupa-modal-tab-nav .active, #pupa-modal-tab-content .active').forEach(el => el.classList.remove('active'));
            target.classList.add('active');
            pupaGetElem(tabId)?.classList.add('active');
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

const pupaAppEl = document.getElementById('app');
if (pupaAppEl) {
    pupaAppEl.style.display = 'none';
}