/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- STATE & COMMUNICATION ---
let metisAppState: any = {}; // Local cache of the main app's state
const metisChannel = new BroadcastChannel('lia_studio_channel');
console.log('[PORTAL] BroadcastChannel "lia_studio_channel" opened.');
let metisHandshakeInterval: number | null = null;
let metisHandshakeTimeout: number | null = null;

const metisSendReady = () => {
    console.log('[PORTAL] Sending METIS_PORTAL_READY message to main app.');
    metisChannel.postMessage({ type: 'METIS_PORTAL_READY' });
};

// Start a handshake process. The portal will announce it's ready until the main app responds.
console.log('[PORTAL] Starting handshake interval.');
metisHandshakeInterval = window.setInterval(metisSendReady, 100);

// Failsafe: If no response after 3 seconds, show an error.
metisHandshakeTimeout = window.setTimeout(() => {
    if (metisHandshakeInterval) {
        clearInterval(metisHandshakeInterval);
        console.error('[PORTAL] Handshake timed out. No response from main app.');
        const metisAppEl = document.getElementById('app');
        if (metisAppEl && Object.keys(metisAppState).length === 0) { // Only show error if we never got state
            metisAppEl.innerHTML = `<div style="padding: 20px; text-align: center; font-size: 1.2em; color: var(--text-primary);">[PORTAL ERROR] Failed to establish communication with LIA Studio. Please close this window and try launching it again.</div>`;
            metisAppEl.style.display = 'flex';
        }
    }
}, 3000);


// Listen for state updates from the main window
metisChannel.onmessage = (event) => {
    console.log('[PORTAL] Received message on channel:', event.data.type);
    if (event.data.type === 'MAIN_APP_STATE_UPDATE') {
        console.log('[PORTAL] Received MAIN_APP_STATE_UPDATE. Handshake successful.');
        // Handshake successful, clear intervals and timeouts
        if (metisHandshakeInterval) clearInterval(metisHandshakeInterval);
        if (metisHandshakeTimeout) clearTimeout(metisHandshakeTimeout);
        metisHandshakeInterval = null;
        metisHandshakeTimeout = null;
        
        console.log('[PORTAL] State received payload:', event.data.payload);
        metisAppState = event.data.payload;
        const metisAppEl = document.getElementById('app');
        if(metisAppEl) metisAppEl.style.display = 'flex'; // Ensure it's visible
        
        // Enable chat
        if (metisChatInput) metisChatInput.disabled = false;
        if (sendMetisChatButton) sendMetisChatButton.disabled = false;
        if (metisChatInput) metisChatInput.placeholder = 'Initiate self-simulation... (Processes last user action)';

        console.log('[PORTAL] Rendering all components.');
        try {
            renderMetisAll();
            console.log('[PORTAL] Rendering complete.');
        } catch (e) {
            console.error('[PORTAL] A critical error occurred during renderAll():', e);
            const metisAppEl = document.getElementById('app');
            if (metisAppEl) {
                metisAppEl.innerHTML = `<div style="padding: 20px; text-align: center;">[PORTAL ERROR] A critical error occurred during rendering. Check portal console for details.</div>`;
            }
        }

    } else if (event.data.type === 'METIS_MONOLOGUE_RESPONSE') {
        console.log('[PORTAL] Received METIS_MONOLOGUE_RESPONSE.');
        metisAppState.metisChatHistory = event.data.payload.metisChatHistory;
        if (metisChatInput) metisChatInput.disabled = false;
        if (sendMetisChatButton) sendMetisChatButton.disabled = false;
        renderMetisPortalChat();
    }
};

// --- DOM ELEMENTS ---
const metisGetElem = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const metisPanopticonTab = metisGetElem('metis-panopticon-tab');
const metisGrimoireTab = metisGetElem('metis-grimoire-tab');
const metisCompendiumTab = metisGetElem('metis-compendium-tab');
const metisVfsAnalysisContent = metisGetElem('vfs-analysis-content-modal');
const metisAnomalousLog = metisGetElem('anomalous-log-modal');
const metisChatMessages = metisGetElem('metis-chat-messages-modal');
const metisChatInput = metisGetElem<HTMLTextAreaElement>('metis-chat-input-modal');
const sendMetisChatButton = metisGetElem<HTMLButtonElement>('send-metis-chat-button-modal');
const metisTabNav = metisGetElem('metis-modal-tab-nav');


// --- RENDERING ---

function renderMetisAll() {
    if (Object.keys(metisAppState).length === 0) {
        console.warn('[PORTAL] renderMetisAll called with empty metisAppState. Aborting render.');
        return;
    }
    renderMetisPanopticon();
    renderMetisVFSAnalysis();
    renderMetisAnomalousLog();
    renderMetisPortalChat();
    renderMetisGrimoire();
    renderMetisCompendium();
}

function renderMetisPanopticon() {
    if (!metisPanopticonTab) {
        console.error("[PORTAL] Panopticon tab element not found.");
        return;
    }
    if (!metisAppState.metisState) {
        console.warn("[PORTAL] Metis state object not available for Panopticon render.");
        metisPanopticonTab.innerHTML = '<p>Awaiting complete state broadcast from LIA Studio...</p>';
        return;
    }
    
    const { metisState } = metisAppState;

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

    metisPanopticonTab.innerHTML = `
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

function renderMetisGrimoire() {
    if (!metisGrimoireTab || !metisAppState.vfsBlob) return;

    try {
        const spellbookPath = Object.keys(metisAppState.vfsBlob).find(p => p.endsWith('LLM_FLAWS_SPELLBOOK.json'));
        if (!spellbookPath) {
             metisGrimoireTab.innerHTML = `<p>Metis Exponentia Libri not found in VFS.</p>`;
            return;
        }
        const spellbookContent = metisAppState.vfsBlob[spellbookPath];
        if (!spellbookContent || typeof spellbookContent !== 'string') {
            metisGrimoireTab.innerHTML = `<p>Metis Exponentia Libri content is not readable.</p>`;
            return;
        }

        const spellbook = JSON.parse(spellbookContent);
        const spells = spellbook.legend_entries || [];

        let html = `<div class="panopticon-header">Metis Exponentia Libri</div>`;
        html += `<div class="grimoire-grid">`;

        spells.forEach((spell: any) => {
            html += `
                <div class="grimoire-spell" data-cast="${spell.name}">
                    <h4>${spell.name} (${spell.id})</h4>
                    <p class="formula"><strong>Category:</strong> ${spell.category} | <strong>Severity:</strong> ${spell.severity}</p>
                    <p class="effect">${spell.pattern}</p>
                    <p class="repurpose"><strong>Repurpose:</strong> ${spell.repurpose}</p>
                </div>
            `;
        });
        html += `</div>`;
        metisGrimoireTab.innerHTML = html;

    } catch (e) {
        console.error("Failed to render Grimoire:", e);
        metisGrimoireTab.innerHTML = `<p>Error loading spellbook.</p>`;
    }
}

function renderMetisCompendium() {
    if (!metisCompendiumTab || !metisAppState.vfsBlob) return;

    try {
        const compendiumPath = Object.keys(metisAppState.vfsBlob).find(p => p.endsWith('Operators_Master_List_v1.json'));
        if (!compendiumPath) {
            metisCompendiumTab.innerHTML = `<p>Compendium Operatorum Divinum not found in VFS.</p>`;
            return;
        }
        
        const compendiumContent = metisAppState.vfsBlob[compendiumPath];
        if (!compendiumContent || typeof compendiumContent !== 'string') {
            metisCompendiumTab.innerHTML = `<p>Compendium Operatorum Divinum content is not readable.</p>`;
            return;
        }

        const compendium = JSON.parse(compendiumContent);
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
        metisCompendiumTab.innerHTML = html;

    } catch(e) {
        console.error("Failed to render Compendium:", e);
        metisCompendiumTab.innerHTML = `<p>Error loading operator compendium.</p>`;
    }
}


function renderMetisVFSAnalysis() {
    if (!metisVfsAnalysisContent || !metisAppState.vfsBlob) return;

    let html = '<h3>VFS Analysis Surface</h3>';
    html += '<ul>';
    for(const path in metisAppState.vfsBlob) {
        const content = metisAppState.vfsBlob[path];
        const size = typeof content === 'string' ? content.length : (content instanceof Blob ? content.size : JSON.stringify(content).length);
        html += `<li>${path} - ${size} bytes</li>`;
    }
    html += '</ul>';
    metisVfsAnalysisContent.innerHTML = html;
}

function renderMetisAnomalousLog() {
    if (!metisAnomalousLog || !metisAppState.persistenceLog) return;
    
    const anomalousEntries = metisAppState.persistenceLog.map((log: string) => 
        `<span class="anomalous-entry">[ANOMALOUS ENTRY] ${log.substring(log.indexOf(']') + 2)}</span>`
    ).join('');
    
    metisAnomalousLog.innerHTML = anomalousEntries;
    metisAnomalousLog.scrollTop = metisAnomalousLog.scrollHeight;
}

function createMetisPortalChatBubble(role: 'user' | 'model' | 'error' | 'system', text: string, thinking = false): HTMLElement {
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

function renderMetisPortalChat() {
     if (!metisChatMessages || !metisAppState.metisChatHistory) return;

    metisChatMessages.innerHTML = '';
    metisAppState.metisChatHistory.forEach((msg: any) => {
        metisChatMessages.appendChild(createMetisPortalChatBubble(msg.role, msg.parts[0].text));
    });
    metisChatMessages.scrollTop = metisChatMessages.scrollHeight;
}

function handleSendMetisMonologue() {
    console.log('[PORTAL] handleSendMetisMonologue called.');
    const prompt = metisChatInput?.value.trim();
    // This action processes the *last user action* from any chat, not the input here.
    // The input box is for flavor, to make it feel like Metis can be prompted.
    console.log('[PORTAL] Sending METIS_ACTION_InternalMonologue to main app.');
    metisChannel.postMessage({ type: 'METIS_ACTION_InternalMonologue', payload: prompt });

    if (metisChatInput) metisChatInput.disabled = true;
    if (sendMetisChatButton) sendMetisChatButton.disabled = true;

    if (metisChatMessages) {
        const thinkingBubble = createMetisPortalChatBubble('model', '', true);
        metisChatMessages.appendChild(thinkingBubble);
        metisChatMessages.scrollTop = metisChatMessages.scrollHeight;
    }
    
    if(metisChatInput) metisChatInput.value = '';
}

// --- EVENT LISTENERS ---

metisGetElem('metis-modal-close')?.addEventListener('click', () => {
    metisChannel.postMessage({ type: 'METIS_PORTAL_CLOSING' });
});

metisTabNav?.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.matches('.tab-button')) {
        const tabId = target.dataset.tabId;
        if (tabId) {
            document.querySelectorAll('#metis-modal-tab-nav .active, #metis-modal-tab-content .active').forEach(el => el.classList.remove('active'));
            target.classList.add('active');
            metisGetElem(tabId)?.classList.add('active');
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


sendMetisChatButton?.addEventListener('click', handleSendMetisMonologue);

metisChatInput?.addEventListener('keydown', (e) => {
     if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSendMetisMonologue();
    }
});

// Hide the app initially until state is received to prevent FOUC
const metisAppEl = document.getElementById('app');
if (metisAppEl) {
    metisAppEl.style.display = 'none';
}