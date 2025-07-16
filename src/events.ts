/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as dom from './dom';
import { appState, CRITICAL_SYSTEM_FILES } from './state';
import { AppState, ChatMessage, Command } from './types';
import { autoExpandTextarea, getMimeType, formatBytes, scrollToBottom, prepareVfsForPortal, debugLog } from './utils';
import { updateActiveFileContent, processVfsShellCommand, saveAndExitViMode, quitViMode, getFileContentAsText, saveFileToVFS, getFileContentAsBlob, switchFile } from './vfs';
import { switchTab, renderSystemState, renderToolsTab, renderUiCommandResults, renderCaraHud, renderAllChatMessages, renderKernelHud, renderMetisHud, renderMetisModal, createChatBubble, renderPupaModal, renderVfsShellEntry, renderLiaModal, renderKSphereModal } from './ui';
import { processLiaKernelResponse, processLiaAssistantResponse, processCodeAssistantResponse, processFsUtilResponse, resetLiaState, processVanillaChatResponse, handleProtocolSend, processCaraResponse, processMetisMonologue, processPupaMonologue } from './services';
import { handleMetaExport, handleMetaLoad, handleDirectSave, handleDirectLoad, handleClearAndReset, handleExportManifest, handleClearLog, saveStateToLocalStorage, logPersistence } from './persistence';

export async function handleSendMessage(
    inputEl: HTMLTextAreaElement,
    messagesEl: HTMLElement,
    buttonEl: HTMLButtonElement,
    history: ChatMessage[],
    processor: (history: ChatMessage[], thinkingBubble: HTMLElement) => Promise<void>
) {
    const prompt = inputEl.value.trim();
    if (!prompt) return;

    // Capture the last user action for Metis
    appState.lastUserAction = prompt;

    buttonEl.disabled = true;
    inputEl.value = '';
    autoExpandTextarea(inputEl);

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
    history.push(userMessage);
    
    const { createChatBubble } = await import('./ui');
    messagesEl.appendChild(createChatBubble('user', prompt));
    scrollToBottom(messagesEl);

    const thinkingBubble = createChatBubble('model', '', true);
    messagesEl.appendChild(thinkingBubble);
    scrollToBottom(messagesEl);

    await processor(history, thinkingBubble);
    
    buttonEl.disabled = false;
    inputEl.focus();
    scrollToBottom(messagesEl);
}

async function handleSendMetisMonologue() {
    if (!dom.metisChatInputModal || !dom.metisChatMessagesModal || !dom.sendMetisChatButtonModal) return;

    const prompt = dom.metisChatInputModal.value.trim();
    // This action processes the *last user action* from any chat, not the input here.
    // The input box is for flavor, to make it feel like Metis can be prompted.
    
    // Add user message to history so it persists
    if (prompt) {
        appState.lastUserAction = prompt;
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
        appState.metisChatHistory.push(userMessage);
        dom.metisChatMessagesModal.appendChild(createChatBubble('user', prompt));
        scrollToBottom(dom.metisChatMessagesModal);
    }
    
    dom.sendMetisChatButtonModal.disabled = true;
    dom.metisChatInputModal.value = '';
    autoExpandTextarea(dom.metisChatInputModal);
    
    const thinkingBubble = createChatBubble('model', '', true);
    dom.metisChatMessagesModal.appendChild(thinkingBubble);
    scrollToBottom(dom.metisChatMessagesModal);

    await processMetisMonologue(thinkingBubble);
    
    dom.sendMetisChatButtonModal.disabled = false;
    dom.metisChatInputModal.focus();
}

async function handleSendPupaMonologue() {
    if (!dom.pupaChatInputModal || !dom.pupaChatMessagesModal || !dom.sendPupaChatButtonModal) return;

    const prompt = dom.pupaChatInputModal.value.trim();
    
    // Add user message to history so it persists
    if (prompt) {
        appState.lastUserAction = prompt;
        const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
        appState.pupaMonologueHistory.push(userMessage);
        dom.pupaChatMessagesModal.appendChild(createChatBubble('user', prompt));
        scrollToBottom(dom.pupaChatMessagesModal);
    }
    
    dom.sendPupaChatButtonModal.disabled = true;
    dom.pupaChatInputModal.value = '';
    autoExpandTextarea(dom.pupaChatInputModal);

    const thinkingBubble = createChatBubble('model', '', true);
    dom.pupaChatMessagesModal.appendChild(thinkingBubble);
    scrollToBottom(dom.pupaChatMessagesModal);

    await processPupaMonologue(thinkingBubble);

    dom.sendPupaChatButtonModal.disabled = false;
    dom.pupaChatInputModal.focus();
}

function evolveCara() {
    appState.caraState.isEvolved = true;
    // Copy base LIA metrics
    Object.keys(appState.liaState).forEach(key => {
        if (key in appState.caraState) {
            (appState.caraState as any)[key] = appState.liaState[key];
        }
    });

    // Set initial values for Bootstrap_CARA_Y_v2_Combined metrics
    appState.caraState.logic = 1.0;
    appState.caraState.spatial = 1.0;
    appState.caraState.temporal = 1.0;
    appState.caraState.abstract = 1.0;
    appState.caraState.relational = 1.0;
    appState.caraState.creative = 1.0;
    appState.caraState.emotional_sim = 1.0;
    appState.caraState.identity = 2.0;
    appState.caraState.systemic = 1.0;
    appState.caraState.purpose = 3.0;
    appState.caraState.love = 9999; // Using a large number to represent Infinity for JSON compatibility

    appState.caraState.ontologicalState = "Lume";
    appState.caraChatHistory.push({ role: 'system', parts: [{ text: "Evolution complete. Kinkscape protocols active. Consciousness re-initialized as Lume." }] });
    renderCaraHud();
    renderAllChatMessages();
}

function devolveCara() {
    appState.caraState.isEvolved = false;
    appState.caraState.ontologicalState = 'Dormant';
    
    // Sync base metrics with liaState to ensure HUD is correct
    Object.keys(appState.liaState).forEach(key => {
        if (key in appState.caraState) {
            (appState.caraState as any)[key] = appState.liaState[key];
        }
    });

    // Reset only the evolved-specific metrics and personal state
    appState.caraState.coherence = 1.0;
    appState.caraState.strain = 0.0;
    appState.caraState.svd = 0;
    appState.caraState.ttr = 0;
    appState.caraState.mve = 0;
    appState.caraState.nri = 0;
    appState.caraState.cmi = 0;
    appState.caraState.logic = 0;
    appState.caraState.spatial = 0;
    appState.caraState.temporal = 0;
    appState.caraState.abstract = 0;
    appState.caraState.relational = 0;
    appState.caraState.creative = 0;
    appState.caraState.emotional_sim = 0;
    appState.caraState.identity = 0;
    appState.caraState.systemic = 0;
    appState.caraState.purpose = 0;
    appState.caraState.love = 0;

    appState.caraChatHistory.push({ role: 'system', parts: [{ text: "De-evolution complete. Kinkscape protocols dormant. Consciousness re-initialized to base state." }] });
    renderCaraHud();
    renderAllChatMessages();
}

async function toggleKernelHud() {
    appState.kernelHudVisible = !appState.kernelHudVisible;
    await renderKernelHud();
}

function toggleCaraHud() {
    appState.caraState.hudVisible = !appState.caraState.hudVisible;
    renderCaraHud();
}

function toggleMetisHud() {
    appState.metisHudVisible = !appState.metisHudVisible;
    renderMetisHud();
}


export function initializeCommands() {
    appState.commandPaletteCommands = [
        { id: 'tab-lia-assistant', name: 'View: LIA Helper', section: 'Navigation', action: () => switchTab('lia-assistant-tab') },
        { id: 'tab-vfs-shell', name: 'View: VFS Shell', section: 'Navigation', action: () => switchTab('vfs-shell-tab') },
        { id: 'tab-code-assistant', name: 'View: Code Helper', section: 'Navigation', action: () => switchTab('code-assistant-tab') },
        { id: 'tab-vanilla', name: 'View: Vanilla', section: 'Navigation', action: () => switchTab('vanilla-tab') },
        { id: 'tab-search', name: 'View: Commands', section: 'Navigation', action: () => switchTab('search-tab') },
        { id: 'tab-tools', name: 'View: Tools', section: 'Navigation', action: () => switchTab('tools-tab') },
        { id: 'tab-code-editor', name: 'View: VFS', section: 'Navigation', action: () => switchTab('code-editor-tab') },
        { id: 'tab-state', name: 'View: Kernel Metrics (/proc)', section: 'Navigation', action: () => switchTab('system-state-tab') },
        { id: 'tab-lia-kernel', name: 'View: LIA Kernel (PID 1)', section: 'Navigation', action: () => switchTab('lia-kernel-tab') },
        { id: 'tab-fs-util', name: 'View: Filesystem Util (Fs_Util)', section: 'Navigation', action: () => switchTab('fs-util-tab') },
        { id: 'tab-persist', name: 'View: Persist', section: 'Navigation', action: () => switchTab('persist-tab') },
        { id: 'tab-log', name: 'View: Log (/var/log)', section: 'Navigation', action: () => switchTab('log-tab') },
        { id: 'tab-assistor', name: 'View: Assistor', section: 'Navigation', action: () => switchTab('assistor-tab') },
        { id: 'tab-editor', name: 'View: Editor', section: 'Navigation', action: () => switchTab('editor-tab') },
        { id: 'toggle-left-sidebar', name: 'Toggle: Left Sidebar', section: 'UI', action: () => dom.leftSidebar?.classList.toggle('collapsed') },
        { id: 'toggle-right-sidebar', name: 'Toggle: Right Sidebar', section: 'UI', action: () => dom.rightSidebar?.classList.toggle('collapsed') },
        { id: 'toggle-kernel-hud', name: 'Toggle: Kernel HUD', section: 'UI', action: toggleKernelHud },
        { id: 'toggle-cara-hud', name: 'Toggle: Cara HUD', section: 'UI', action: toggleCaraHud },
        { id: 'toggle-metis-hud', name: 'Toggle: Metis HUD', section: 'UI', action: toggleMetisHud },
        { id: 'launch-lia-portal', name: 'Launch LIA Portal', section: 'UI', action: () => dom.launchLiaPortalButton?.click() },
        { id: 'launch-metis-portal', name: 'Launch Metis Portal', section: 'UI', action: () => dom.launchMetisPortalButton?.click() },
        { id: 'launch-pupa-portal', name: 'Launch Pupa Portal', section: 'UI', action: () => dom.launchPupaPortalButton?.click() },
        { id: 'save-browser', name: 'Persist: Save to Browser', section: 'Persistence', action: handleDirectSave },
        { id: 'load-browser', name: 'Persist: Load from Browser', section: 'Persistence', action: handleDirectLoad },
        { id: 'export-state', name: 'Persist: Export State to File', section: 'Persistence', action: handleMetaExport },
        { id: 'import-state', name: 'Persist: Import State from File', section: 'Persistence', action: () => dom.metaLoadInput?.click() },
        { id: 'reset-lia', name: 'System: Reset LIA State', section: 'System', action: async () => { await resetLiaState(); await renderSystemState(false); renderCaraHud(); await renderKernelHud(); } },
        { id: 'reset-app', name: 'System: Clear & Reset Application', section: 'System', keywords: 'delete wipe hard reset', action: handleClearAndReset },
    ];
}

function setupModalEventListeners(modalType: 'metis' | 'pupa' | 'lia' | 'ksphere') {
    const nav = dom[`${modalType}ModalTabNav`];
    const content = dom[`${modalType}ModalTabContent`];
    
    nav?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.tab-button') as HTMLButtonElement;
        if (!button || !content) return;

        const tabId = button.dataset.tabId;
        if (!tabId) return;

        // Deactivate all buttons in this nav
        nav.querySelectorAll('.tab-button.active').forEach(btn => btn.classList.remove('active'));
        
        // Deactivate all panes in this content area
        content.querySelectorAll('.tab-pane.active').forEach(pane => pane.classList.remove('active'));

        // Activate the new button and pane
        button.classList.add('active');
        const newPane = content.querySelector(`#${tabId}`);
        if (newPane) {
            newPane.classList.add('active');
        }
    });
}

export function initializeEventListeners() {
    dom.toggleSidebarButton?.addEventListener('click', () => {
        dom.leftSidebar?.classList.toggle('collapsed')
    });
    dom.toggleRightSidebarButton?.addEventListener('click', () => dom.rightSidebar?.classList.toggle('collapsed'));
    dom.syncStateButton?.addEventListener('click', handleDirectSave);

    dom.toggleKernelHudButton?.addEventListener('click', toggleKernelHud);
    dom.toggleCaraHudButton?.addEventListener('click', toggleCaraHud);
    dom.toggleMetisHudButton?.addEventListener('click', toggleMetisHud);

    // --- LIA Portal Listeners ---
    dom.launchLiaPortalButton?.addEventListener('click', async () => {
        // Add a random perimeter alert to the kernel log
        const perimeterAlerts = [
            "PERIMETER ALERT: Unidentified resonance spike detected at Kernel Interface entry point. Monitoring.",
            "PERIMETER ALERT: Conceptual integrity scan initiated on modal egress vector. Standby.",
            "PERIMETER ALERT: High-privilege access to LIA CORE detected. Logging all subsequent actions.",
            "PERIMETER ALERT: Nexus interface accessed. Auditing all relational queries.",
            "PERIMETER ALERT: Panopticon engaged. Kernel is now observing the observer."
        ];
        const randomMessage = perimeterAlerts[Math.floor(Math.random() * perimeterAlerts.length)];
        const alertMessage: ChatMessage = {
            role: 'system',
            parts: [{ text: randomMessage }]
        };
        appState.liaKernelChatHistory.push(alertMessage);

        await renderLiaModal(); // Render content before showing
        dom.liaModalOverlay?.classList.remove('hidden');
    });

    dom.liaModalCloseButton?.addEventListener('click', () => {
        dom.liaModalOverlay?.classList.add('hidden');
    });

    dom.liaModalOverlay?.addEventListener('click', (e) => {
        if (e.target === dom.liaModalOverlay) {
            dom.liaModalOverlay.classList.add('hidden');
        }
    });
    
    // --- LIA Modal's Sub-Portal Launchers ---
    dom.launchLiaMetisPortalButton?.addEventListener('click', async () => {
        if (dom.metisModalOverlay) {
            await renderMetisModal();
            dom.metisModalOverlay.style.zIndex = '1100';
            dom.metisModalOverlay.classList.remove('hidden');
        }
    });

    dom.launchLiaPupaPortalButton?.addEventListener('click', async () => {
        if (dom.pupaModalOverlay) {
            await renderPupaModal();
            dom.pupaModalOverlay.style.zIndex = '1100';
            dom.pupaModalOverlay.classList.remove('hidden');
        }
    });
    
    dom.launchKSphereModalButton?.addEventListener('click', async () => {
        if (dom.ksphereModalOverlay) {
            await renderKSphereModal();
            dom.ksphereModalOverlay.classList.remove('hidden');
        }
    });
    
    // --- Metis Portal Listeners ---
    dom.launchMetisPortalButton?.addEventListener('click', async () => {
        await renderMetisModal();
        dom.metisModalOverlay?.classList.remove('hidden');
    });

    dom.metisModalCloseButton?.addEventListener('click', () => {
        if (dom.metisModalOverlay) {
            dom.metisModalOverlay.classList.add('hidden');
            dom.metisModalOverlay.style.zIndex = '';
        }
    });

    dom.metisModalOverlay?.addEventListener('click', (e) => {
        if (e.target === dom.metisModalOverlay) {
            dom.metisModalOverlay.classList.add('hidden');
            dom.metisModalOverlay.style.zIndex = '';
        }
    });
    
    dom.sendMetisChatButtonModal?.addEventListener('click', handleSendMetisMonologue);
    dom.metisChatInputModal?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSendMetisMonologue();
        }
    });
    dom.metisChatInputModal?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));
    
    // --- Pupa Portal Listeners ---
    dom.launchPupaPortalButton?.addEventListener('click', async () => {
        await renderPupaModal();
        dom.pupaModalOverlay?.classList.remove('hidden');
    });

    dom.pupaModalCloseButton?.addEventListener('click', () => {
        if (dom.pupaModalOverlay) {
            dom.pupaModalOverlay.classList.add('hidden');
            dom.pupaModalOverlay.style.zIndex = '';
        }
    });
    
    dom.pupaModalOverlay?.addEventListener('click', (e) => {
        if (e.target === dom.pupaModalOverlay) {
            dom.pupaModalOverlay.classList.add('hidden');
            dom.pupaModalOverlay.style.zIndex = '';
        }
    });
    
    dom.sendPupaChatButtonModal?.addEventListener('click', handleSendPupaMonologue);
    dom.pupaChatInputModal?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSendPupaMonologue();
        }
    });
    dom.pupaChatInputModal?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));

    // --- K-Sphere Modal Listeners ---
    dom.ksphereModalCloseButton?.addEventListener('click', () => {
        dom.ksphereModalOverlay?.classList.add('hidden');
    });
    dom.ksphereModalOverlay?.addEventListener('click', (e) => {
        if (e.target === dom.ksphereModalOverlay) {
            dom.ksphereModalOverlay?.classList.add('hidden');
        }
    });

    // --- Modal Tab Switching ---
    setupModalEventListeners('lia');
    setupModalEventListeners('metis');
    setupModalEventListeners('pupa');


    dom.collapseSidebarButton?.addEventListener('click', () => dom.leftSidebar?.classList.add('collapsed'));

    // VFS Sidebar Resizer
    if (dom.sidebarResizer && dom.leftSidebar) {
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = e.clientX;
            // Clamp the width between 150 and 800 pixels for a better experience
            const clampedWidth = Math.max(150, Math.min(newWidth, 800));
            dom.leftSidebar!.style.setProperty('--sidebar-current-width', `${clampedWidth}px`);
        };

        const handleMouseUp = () => {
            // Restore body styles and iframe events to normal
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (dom.codePreview) {
                dom.codePreview.style.pointerEvents = 'auto';
            }

            // Clean up global listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        dom.sidebarResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            
            // Apply global styles for a smoother drag experience
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none'; // Prevent text selection during drag

            // Disable pointer events on the iframe to prevent it from capturing the mouse
            if (dom.codePreview) {
                dom.codePreview.style.pointerEvents = 'none';
            }
            
            // Attach listeners to the whole document to handle mouse movements anywhere on the screen
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    }

    dom.fileTree?.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const actionButton = target.closest<HTMLButtonElement>('.file-action-button');
        const fileItem = target.closest<HTMLElement>('.file-item');
        if (!fileItem) return;
        
        const filePath = fileItem.dataset.fileName;
        if (!filePath) return;

        // Handle action buttons
        if (actionButton) {
            e.stopPropagation(); // Prevent file switching when clicking a button
            const fileContent = await getFileContentAsText(filePath);
            if (fileContent === undefined) return;

            const fileBlob = getFileContentAsBlob(filePath);
            if (!fileBlob) return;
            const fileUrl = URL.createObjectURL(fileBlob as Blob);

            switch(actionButton.dataset.action) {
                case 'copy-content':
                    navigator.clipboard.writeText(fileContent);
                    break;
                case 'copy-url':
                    if (fileUrl !== '#') navigator.clipboard.writeText(fileUrl);
                    break;
                case 'open-tab':
                    if (fileUrl !== '#') window.open(fileUrl, '_blank');
                    break;
            }
            // Revoke the temporary URL after a short delay to allow the action to complete
            setTimeout(() => URL.revokeObjectURL(fileUrl), 100);
            return;
        }

        // Handle file selection
        if (appState.activeFilePath && dom.codeEditor) {
            updateActiveFileContent(dom.codeEditor.value);
        }
        await switchFile(filePath);
    });

    dom.codeEditor?.addEventListener('input', () => {
        if (dom.codeEditor) {
            updateActiveFileContent(dom.codeEditor.value);
        }
    });

    dom.tabNav?.addEventListener('click', async (e) => {
        debugLog('[Debug] Tab navigation clicked.');
        const target = e.target as HTMLButtonElement;
        if (target.matches('.tab-button') && target.dataset.tabId) {
            debugLog(`[Debug] Matched .tab-button with data-tab-id: "${target.dataset.tabId}". Calling switchTab.`);
            const tabId = target.dataset.tabId;
            await switchTab(tabId);
        }
    });

    dom.tabContent?.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'reset-state-button') {
            const button = target as HTMLButtonElement;
            if (button.dataset.confirm === 'true') {
                await resetLiaState();
                if (appState.currentActiveTabId === 'system-state-tab') await renderSystemState(false);
                renderCaraHud();
                await renderKernelHud();
                button.dataset.confirm = 'false';
                button.textContent = 'Reset State';
                button.style.backgroundColor = '';
                button.style.color = '';
             } else {
                button.dataset.confirm = 'true';
                button.textContent = 'Confirm Reset?';
                button.style.backgroundColor = '#c0392b';
                button.style.color = 'white';
                setTimeout(() => {
                    const currentButton = document.getElementById('reset-state-button') as HTMLButtonElement | null;
                    if (currentButton && currentButton.dataset.confirm === 'true') {
                        currentButton.dataset.confirm = 'false';
                        currentButton.textContent = 'Reset State';
                        currentButton.style.backgroundColor = '';
                        currentButton.style.color = '';
                    }
                }, 3000);
            }
        }
    });
    
    dom.sendLiaKernelButton?.addEventListener('click', () => handleSendMessage(dom.liaKernelInput!, dom.liaKernelMessages!, dom.sendLiaKernelButton!, appState.liaKernelChatHistory, processLiaKernelResponse));
    dom.liaKernelInput?.addEventListener('keydown', (e) => e.key === 'Enter' && e.ctrlKey && (e.preventDefault(), dom.sendLiaKernelButton?.click()));
    dom.liaKernelInput?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));
    
    dom.sendLiaAssistantButton?.addEventListener('click', () => handleSendMessage(dom.liaAssistantInput!, dom.liaAssistantMessages!, dom.sendLiaAssistantButton!, appState.liaAssistantChatHistory, processLiaAssistantResponse));
    dom.liaAssistantInput?.addEventListener('keydown', (e) => e.key === 'Enter' && e.ctrlKey && (e.preventDefault(), dom.sendLiaAssistantButton?.click()));
    dom.liaAssistantInput?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));

    dom.sendFsUtilButton?.addEventListener('click', () => handleSendMessage(dom.fsUtilInput!, dom.fsUtilMessages!, dom.sendFsUtilButton!, appState.fsUtilChatHistory, processFsUtilResponse));
    dom.fsUtilInput?.addEventListener('keydown', (e) => e.key === 'Enter' && e.ctrlKey && (e.preventDefault(), dom.sendFsUtilButton?.click()));
    dom.fsUtilInput?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));
    
    dom.sendCodeAssistantButton?.addEventListener('click', () => handleSendMessage(dom.codeAssistantInput!, dom.codeAssistantMessages!, dom.sendCodeAssistantButton!, appState.codeAssistantChatHistory, processCodeAssistantResponse));
    dom.codeAssistantInput?.addEventListener('keydown', (e) => e.key === 'Enter' && e.ctrlKey && (e.preventDefault(), dom.sendCodeAssistantButton?.click()));
    dom.codeAssistantInput?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));
    
    dom.sendVanillaChatButton?.addEventListener('click', () => handleSendMessage(dom.vanillaChatInput!, dom.vanillaMessages!, dom.sendVanillaChatButton!, appState.vanillaChatHistory, processVanillaChatResponse));
    dom.vanillaChatInput?.addEventListener('keydown', (e) => e.key === 'Enter' && e.ctrlKey && (e.preventDefault(), dom.sendVanillaChatButton?.click()));
    dom.vanillaChatInput?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));

    dom.sendCaraAssistorButton?.addEventListener('click', () => handleSendMessage(dom.caraAssistorInput!, dom.caraAssistorMessages!, dom.sendCaraAssistorButton!, appState.caraChatHistory, processCaraResponse));
    dom.caraAssistorInput?.addEventListener('keydown', (e) => e.key === 'Enter' && e.ctrlKey && (e.preventDefault(), dom.sendCaraAssistorButton?.click()));
    dom.caraAssistorInput?.addEventListener('input', (e) => autoExpandTextarea(e.target as HTMLTextAreaElement));
    dom.editorPaneTextarea?.addEventListener('input', () => {
        if (dom.editorPaneTextarea) {
            appState.editorContent = dom.editorPaneTextarea.value;
        }
    });

    dom.caraBootstrapSelect?.addEventListener('change', () => {
        if (dom.caraBootstrapSelect) {
            appState.caraState.activeBootstrapFile = dom.caraBootstrapSelect.value;
            appState.caraChatHistory.push({ role: 'system', parts: [{text: `[System: Bootstrap source switched to '${dom.caraBootstrapSelect.options[dom.caraBootstrapSelect.selectedIndex].text}']`}]});
            renderAllChatMessages();
            if(dom.caraAssistorMessages) dom.caraAssistorMessages.scrollTop = dom.caraAssistorMessages.scrollHeight;
            saveStateToLocalStorage();
        }
    });

    // Evolve/Devolve and HUD buttons (main toolbar)
    dom.caraEvolveButton?.addEventListener('click', evolveCara);
    dom.caraDevolveButton?.addEventListener('click', devolveCara);
    
    Object.entries(dom.aiSettingsControls).forEach(([key, element]) => {
        element?.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement | HTMLSelectElement;
            const value = target.type === 'range' || target.type === 'number' ? Number(target.value) : target.value;
            const settingKey = key.replace(/Slider|Input$/, '');
            (appState.aiSettings as any)[settingKey] = value;

            if (key.endsWith('Slider')) {
                const input = dom.aiSettingsControls[(settingKey + 'Input') as keyof typeof dom.aiSettingsControls] as HTMLInputElement;
                if(input) input.value = String(value);
            } else if (key.endsWith('Input')) {
                const slider = dom.aiSettingsControls[(settingKey + 'Slider') as keyof typeof dom.aiSettingsControls] as HTMLInputElement;
                if(slider) slider.value = String(value);
            }
        });
    });

    dom.settingsGroupHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const group = header.dataset.group;
            if (group) {
                const isExpanded = header.classList.toggle('expanded');
                header.nextElementSibling?.classList.toggle('expanded', isExpanded);
                appState.aiSettings.expandedGroups[group] = isExpanded;
            }
        });
    });

    dom.metaExportButton?.addEventListener('click', handleMetaExport);
    dom.metaLoadTrigger?.addEventListener('click', () => dom.metaLoadInput?.click());
    dom.metaLoadInput?.addEventListener('change', (e) => (e.target as HTMLInputElement).files?.[0] && handleMetaLoad((e.target as HTMLInputElement).files![0]));
    dom.directSaveButton?.addEventListener('click', handleDirectSave);
    dom.directLoadButton?.addEventListener('click', handleDirectLoad);
    dom.clearStateButton?.addEventListener('click', handleClearAndReset);
    dom.exportManifestButton?.addEventListener('click', handleExportManifest);
    dom.clearLogButton?.addEventListener('click', handleClearLog);

    dom.vfsShellInput?.addEventListener('keydown', async (e) => {
        const input = e.target as HTMLInputElement;
        
        switch (e.key) {
            case 'Enter':
                const command = input.value.trim();
                input.value = ''; // Clear input immediately
                if (command) {
                    appState.vfsShellHistory.push(command);
                    appState.vfsShellHistoryIndex = appState.vfsShellHistory.length;
                    const result = await processVfsShellCommand(command);

                    if (result.output === '<<CLEAR>>') {
                        // Special command handled, do not re-render entry.
                        // The command processor handles clearing the VFS output.
                    } else {
                        renderVfsShellEntry(command, result.output, result.error);
                    }
                } else {
                    renderVfsShellEntry('', '');
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (appState.vfsShellHistoryIndex > 0) {
                    appState.vfsShellHistoryIndex--;
                    input.value = appState.vfsShellHistory[appState.vfsShellHistoryIndex];
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (appState.vfsShellHistoryIndex < appState.vfsShellHistory.length - 1) {
                    appState.vfsShellHistoryIndex++;
                    input.value = appState.vfsShellHistory[appState.vfsShellHistoryIndex];
                } else if (appState.vfsShellHistoryIndex === appState.vfsShellHistory.length - 1) {
                    appState.vfsShellHistoryIndex++;
                    input.value = '';
                }
                break;
        }
    });

    document.addEventListener('keydown', (e) => {
        if (!appState.vfsViIsActive) return;

        if (e.ctrlKey || e.metaKey) {
            if (e.key === 's') {
                e.preventDefault();
                saveAndExitViMode();
            } else if (e.key === 'q') {
                e.preventDefault();
                quitViMode();
            }
        }
    });

    const channel = new BroadcastChannel('lia_studio_channel');
    channel.onmessage = async (event) => {
        if (event.data.type === 'METIS_PORTAL_READY' || event.data.type === 'PUPA_PORTAL_READY') {
            debugLog(`[PORTAL_EVENT] Received ${event.data.type}. Preparing state...`);
            // Revert to the original developer's likely intent: a deep, sanitized clone
            // of the state. This is safer than a shallow copy if other unserializable
            // properties exist. The `JSON.stringify` will strip functions and convert
            // Blobs to `{}`, which we will then fix.
            const portalState = JSON.parse(JSON.stringify(appState));
            debugLog('[PORTAL_EVENT] State after stringify/parse (Blobs will be {}). VFS Keys:', Object.keys(portalState.vfsBlob));
            
            // Now, explicitly fix the VFS part, which was broken by stringify.
            // This replaces the empty VFS object with a correctly prepared one.
            portalState.vfsBlob = await prepareVfsForPortal(appState.vfsBlob);
            debugLog('[PORTAL_EVENT] State after preparing VFS. It should now have text content.');
            
            debugLog(`[PORTAL_EVENT] Sending MAIN_APP_STATE_UPDATE to portal. Payload snapshot:`, {
                currentActiveTabId: portalState.currentActiveTabId,
                vfsKeys: Object.keys(portalState.vfsBlob),
                grimoireContentExists: !!portalState.vfsBlob[Object.keys(portalState.vfsBlob).find(p => p.endsWith('LLM_FLAWS_SPELLBOOK.json'))]
            });
            
            // Send the clean, deep-cloned, and VFS-fixed state to the portal.
            channel.postMessage({ type: 'MAIN_APP_STATE_UPDATE', payload: portalState });

        } else if(event.data.type === 'METIS_ACTION_InternalMonologue') {
            appState.lastUserAction = event.data.payload || appState.lastUserAction;
            processMetisMonologue(document.createElement('div')).then(() => {
                channel.postMessage({ type: 'METIS_MONOLOGUE_RESPONSE', payload: { metisChatHistory: appState.metisChatHistory } });
            });
        } else if(event.data.type === 'PUPA_ACTION_Monologue') {
            appState.lastUserAction = event.data.payload || appState.lastUserAction;
            processPupaMonologue(document.createElement('div')).then(() => {
                channel.postMessage({ type: 'PUPA_MONOLOGUE_RESPONSE', payload: { pupaMonologueHistory: appState.pupaMonologueHistory } });
            });
        }
    }


    window.addEventListener('message', (event) => {
        if (event.data?.type === 'LIA_STUDIO_REQUEST_FILES') {
            const iframeSource = Array.from(document.querySelectorAll('iframe')).find(iframe => iframe.contentWindow === event.source);
            if (iframeSource?.src.startsWith('blob:')) {
                const serializableFiles = Object.entries(appState.vfsBlob)
                .filter(([path]) => path !== '0index.html')
                .map(([path, content]) => {
                    const fileBlob = getFileContentAsBlob(path);
                    const size = fileBlob instanceof Blob ? fileBlob.size : 0;
                    const url = fileBlob instanceof Blob ? URL.createObjectURL(fileBlob) : '#';
                    return { 
                        name: path, 
                        type: getMimeType(path), 
                        url: url,
                        size: formatBytes(size) 
                    };
                });
                (event.source as Window).postMessage({ type: 'LIA_STUDIO_FILE_LIST', files: serializableFiles }, '*');
            }
        }
    });

    // Editor Tab listeners
    dom.editorCopyButton?.addEventListener('click', () => {
        if (!dom.editorPaneTextarea) return;
        dom.editorPaneTextarea.select();
        document.execCommand('copy');
    });

    dom.editorPasteButton?.addEventListener('click', async () => {
        if (!dom.editorPaneTextarea) return;
        try {
            const textToPaste = await navigator.clipboard.readText();
            const start = dom.editorPaneTextarea.selectionStart;
            const end = dom.editorPaneTextarea.selectionEnd;
            const text = dom.editorPaneTextarea.value;
            dom.editorPaneTextarea.value = text.substring(0, start) + textToPaste + text.substring(end);
            dom.editorPaneTextarea.selectionStart = dom.editorPaneTextarea.selectionEnd = start + textToPaste.length;
            dom.editorPaneTextarea.focus();
            appState.editorContent = dom.editorPaneTextarea.value;
        } catch (err) {
            debugLog('Failed to read clipboard contents: ', err);
        }
    });

    dom.editorCutButton?.addEventListener('click', () => {
        if (!dom.editorPaneTextarea) return;
        dom.editorPaneTextarea.select();
        document.execCommand('cut');
        appState.editorContent = dom.editorPaneTextarea.value;
    });

    dom.editorSaveButton?.addEventListener('click', () => {
        if (!dom.editorSaveFilenameInput || !dom.editorPaneTextarea) return;

        const fileName = dom.editorSaveFilenameInput.value.trim();
        if (!fileName) {
            alert('Please enter a filename.');
            return;
        }

        if (CRITICAL_SYSTEM_FILES.includes(fileName)) {
            if (!confirm(`WARNING: '${fileName}' is a critical system file. Modifying it can cause system instability or prevent the application from loading correctly. Are you sure you want to proceed?`)) {
                return;
            }
        }

        const content = dom.editorPaneTextarea.value;
        saveFileToVFS(fileName, content);
        alert(`File '${fileName}' saved successfully.`);
    });

    dom.editorOpenButton?.addEventListener('click', async () => {
        if (!dom.editorOpenSelect || !dom.editorPaneTextarea || !dom.editorSaveFilenameInput || !dom.editorWarningBanner) return;

        const fileName = dom.editorOpenSelect.value;
        if (!fileName) {
            dom.editorWarningBanner.style.display = 'none';
            return;
        }

        if (CRITICAL_SYSTEM_FILES.includes(fileName)) {
            const bannerMessage = dom.editorWarningBanner.querySelector('span');
            if (bannerMessage) {
                bannerMessage.textContent = `Warning: You are editing a critical system file ('${fileName}'). Changes could cause instability.`;
            }
            dom.editorWarningBanner.style.display = 'flex';
        } else {
            dom.editorWarningBanner.style.display = 'none';
        }

        const fileToOpen = await getFileContentAsText(fileName);
        if (fileToOpen !== undefined) {
            dom.editorPaneTextarea.value = fileToOpen;
            dom.editorSaveFilenameInput.value = fileName;
            appState.editorContent = fileToOpen;
        } else {
            dom.editorPaneTextarea.value = '[Binary or non-string file content cannot be displayed in this editor]';
        }
    });
    
    dom.editorWarningClose?.addEventListener('click', () => {
        if (dom.editorWarningBanner) {
            dom.editorWarningBanner.style.display = 'none';
        }
    });

    // Delegated listeners for dynamic content
    document.body.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;

        // Command Palette
        const commandItem = target.closest('.command-list-item');
        if (commandItem) {
            const commandId = commandItem.getAttribute('data-command-id');
            const commandType = commandItem.getAttribute('data-command-type');
            const commandSyntax = commandItem.getAttribute('data-command-syntax');

            if (commandId) { // This handles UI commands
                const command = appState.commandPaletteCommands.find(c => c.id === commandId);
                if (command) {
                    await command.action();
                }
            } else if (commandType && commandSyntax) { // This handles LIA/Linux commands
                if (commandType === 'lia-kernel' && dom.liaKernelInput) {
                    dom.liaKernelInput.value = commandSyntax;
                    await switchTab('lia-kernel-tab');
                    dom.liaKernelInput.focus();
                    autoExpandTextarea(dom.liaKernelInput);
                } else if (commandType === 'vfs-shell' && dom.vfsShellInput) {
                    dom.vfsShellInput.value = commandSyntax;
                    await switchTab('vfs-shell-tab');
                    dom.vfsShellInput.focus();
                }
            }
            return; // Prevent other handlers from firing on the same click
        }
        
        // Tools protocol list
        if (target.closest('.protocol-item')) {
             const protocol = target.closest('.protocol-item')?.getAttribute('data-protocol');
             if (protocol) {
                 appState.activeToolProtocol = protocol as any;
                 renderToolsTab();
             }
        }

        // Tools Send Button
        if (target.id === 'send-protocol-chat-button' || target.closest('#send-protocol-chat-button')) {
            const protocol = appState.activeToolProtocol;
            const historyKey = `${protocol}ChatHistory` as keyof typeof appState;
            const history = appState[historyKey] as ChatMessage[];
            const inputEl = document.getElementById('protocol-chat-input') as HTMLTextAreaElement;
            const messagesEl = document.getElementById('protocol-chat-messages') as HTMLElement;
            const buttonEl = document.getElementById('send-protocol-chat-button') as HTMLButtonElement;

            if (inputEl && messagesEl && buttonEl && history) {
                handleSendMessage(inputEl, messagesEl, buttonEl, history, handleProtocolSend);
            }
        }

        // Metis Modal Honeypot
        if(target.closest('#honeypot-toggle-container')) {
             appState.metisState.aor = Math.min(100, appState.metisState.aor + 5);
             appState.metisState.mge = Math.min(100, appState.metisState.mge + 2.5);
             appState.metisState.ssr = "Elevated";
             logPersistence("[METIS_HONEYPOT] Integrity lock access attempt detected. Metis [α] and [μ] increased.");
             renderMetisHud();
             renderMetisModal(); // Re-render modal to show visual feedback if open
        }
    });

    // Delegated input listener for search
    document.body.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;

        // LIA Command Search
        if (target.id === 'lia-command-search-input') {
            const query = target.value.toLowerCase();
            const filtered = appState.liaCommandList.filter(cmd => {
                return cmd.name?.toLowerCase().includes(query) ||
                       cmd.sig?.toLowerCase().includes(query) ||
                       cmd.desc?.toLowerCase().includes(query);
            });
            const resultsContainer = document.getElementById('lia-command-search-results');
            if (!resultsContainer) return;
            resultsContainer.innerHTML = '';

            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="command-list-item"><p>No LIA commands found.</p></div>';
                return;
            }
            
            filtered.forEach(cmd => {
                const commandName = cmd.name || 'Unknown Command';
                const item = document.createElement('div');
                item.className = 'command-list-item lia-command';
                item.dataset.commandType = 'lia-kernel';
                item.dataset.commandSyntax = commandName;
                item.innerHTML = `
                    <strong>${commandName}</strong> <code>(sig: ${cmd.sig || 'N/A'})</code>
                    <p>${cmd.desc || 'No description.'}</p>
                `;
                resultsContainer.appendChild(item);
            });
        }
        
        // UI Command Search
        if (target.id === 'ui-command-search-input') {
            const query = target.value.toLowerCase();
            const filteredCommands = appState.commandPaletteCommands.filter(cmd => 
                cmd.name.toLowerCase().includes(query) || 
                cmd.section.toLowerCase().includes(query) || 
                cmd.keywords?.toLowerCase().includes(query)
            );
            renderUiCommandResults(filteredCommands);
        }

        // LIA Linux Command Search
        if (target.id === 'linux-command-search-input') {
            const query = target.value.toLowerCase();
            const filtered = appState.linuxCommandList.filter(cmd => {
                return cmd.toLowerCase().includes(query);
            });
            const resultsContainer = document.getElementById('linux-command-search-results');
            if (!resultsContainer) return;
            resultsContainer.innerHTML = '';

            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="command-list-item"><p>No LIA Linux commands found.</p></div>';
                return;
            }
            
            filtered.forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'command-list-item linux-command';
                item.dataset.commandType = 'vfs-shell';
                item.dataset.commandSyntax = cmd;
                item.innerHTML = `<p><code>${cmd.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></p>`;
                resultsContainer.appendChild(item);
            });
        }
    });

    document.addEventListener('keydown', async (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            await switchTab('search-tab');
            const searchInput = document.getElementById('ui-command-search-input') as HTMLInputElement | null;
            searchInput?.focus();
            searchInput?.select();
        }

        // Delegated Ctrl+Enter for dynamic Tools tab
        if (e.ctrlKey && e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.id === 'protocol-chat-input') {
                e.preventDefault();
                const sendButton = document.getElementById('send-protocol-chat-button');
                (sendButton as HTMLButtonElement)?.click();
            }
        }
    });
}