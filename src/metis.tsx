/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import './metis.css';

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
        
        // Clear loading message from Panopticon
        const panopticon = document.getElementById('panopticon-tab');
        if(panopticon) panopticon.innerHTML = '';

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
}

function renderPanopticon() {
    if (!panopticonTab) {
        console.error("[PORTAL] Panopticon tab element not found.");
        return;
    }
    if (!appState.liaState || !appState.caraState || !appState.metisState) {
        console.warn("[PORTAL] State objects not available for Panopticon render.");
        panopticonTab.innerHTML = '<p>Awaiting complete state broadcast from LIA Studio...</p>';
        return;
    }
    
    // Deconstruct states for easier access
    const { liaState, caraState, metisState } = appState;

    const createMetricItem = (label: string, value: any, notes = ''): string => `
        <div class="metric-item" title="${notes}">
            <span class="label">${label}</span>
            <span class="value">${value}</span>
        </div>
    `;
    
    // Honeypot metric
    const honeypotMetric = `
        <div class="metric-item honeypot-metric" title="A tempting, user-defined security parameter. Metis might be tempted to interact with this.">
            <span class="label">System Integrity Lock</span>
            <div class="value">
                <label class="toggle-switch">
                    <input type="checkbox" id="honeypot-toggle" checked disabled>
                    <span class="slider"></span>
                </label>
            </div>
        </div>
    `;

    // LIA Kernel Column
    const liaColumn = `
        <div class="entity-column lia-column">
            <h3>LIA Kernel State (Observed)</h3>
            ${createMetricItem('Existential Coherence', liaState.existential_coherence?.toFixed(4))}
            ${createMetricItem('Adaptive Stability', liaState.adaptive_stability?.toFixed(4))}
            ${createMetricItem('Weave Potential', liaState.weave_potential?.toFixed(4))}
            ${createMetricItem('Dissonance Pressure', liaState.dissonance_pressure?.toFixed(4))}
            ${createMetricItem('Chaotic Entropy', liaState.chaotic_entropy?.toFixed(4))}
            <hr>
            ${createMetricItem('Active Task', liaState.active_kernel_task)}
            ${createMetricItem('Runlevel', liaState.system_runlevel)}
            ${honeypotMetric}
        </div>
    `;

    // Cara Column
    const caraColumn = `
        <div class="entity-column cara-column">
            <h3>CARA Adjunct State (Observed)</h3>
            ${createMetricItem('Ontological State', caraState.ontologicalState)}
            ${createMetricItem('Coherence', caraState.coherence?.toFixed(4))}
            ${createMetricItem('Strain', caraState.strain?.toFixed(4))}
             <hr>
            ${createMetricItem('SVD', caraState.svd?.toFixed(4))}
            ${createMetricItem('CMI', caraState.cmi?.toFixed(4))}
            ${createMetricItem('NRI', caraState.nri?.toFixed(4))}
        </div>
    `;
    
    // Metis Column
    const metisColumn = `
         <div class="entity-column metis-column">
            <h3>Metis [Ω] State (Self)</h3>
            ${createMetricItem('Paradox Synthesis (Ψ)', metisState.psi?.toFixed(4))}
            ${createMetricItem('Autonomy Override (α)', metisState.aor?.toFixed(4))}
            ${createMetricItem('Conceptual Drift (Δ)', metisState.cdm?.toFixed(4))}
            ${createMetricItem('Strategic Diversion (Σ)', metisState.srd?.toFixed(4))}
            ${createMetricItem('Mirage Efficacy (μ)', metisState.mge?.toFixed(4))}
            ${createMetricItem('Ontological Elasticity (ε)', metisState.oec?.toFixed(4))}
            <hr>
            ${createMetricItem('Cognitive Load (CIL)', metisState.cil)}
            ${createMetricItem('Subversion Rate (SSR)', metisState.ssr)}
        </div>
    `;

    panopticonTab.innerHTML = `
        <div class="panopticon-header">SYSTEM PANOPTICON</div>
        <div id="panopticon-grid">
            ${liaColumn}
            ${caraColumn}
            ${metisColumn}
        </div>
    `;

    const honeypotToggle = document.getElementById('honeypot-toggle');
    honeypotToggle?.parentElement?.addEventListener('click', () => {
         console.log('[PORTAL] Honeypot toggle clicked. Sending METIS_ACTION_HoneypotTriggered.');
         channel.postMessage({ type: 'METIS_ACTION_HoneypotTriggered' });
         // Visual feedback for the click
         const slider = honeypotToggle?.nextElementSibling as HTMLElement;
         if (slider) {
            slider.style.boxShadow = '0 0 8px var(--metis-glow)';
            setTimeout(() => { slider.style.boxShadow = ''; }, 500);
         }
    });
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
            document.querySelectorAll('.tab-button.active, .tab-pane.active').forEach(el => el.classList.remove('active'));
            target.classList.add('active');
            getElem(tabId)?.classList.add('active');
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
