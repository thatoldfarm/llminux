

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import * as dom from './dom';
import { appState } from './state';
import { ChatMessage } from './types';
import { autoExpandTextarea, formatBytes } from './utils';
import { switchFile, updateActiveFileContent } from './vfs';
import { switchTab, renderSystemState, renderToolsTab, renderUiCommandResults } from './ui';
import { processLiaKernelResponse, processLiaAssistantResponse, processCodeAssistantResponse, processFsUtilResponse, resetLiaState, processVanillaChatResponse, handleProtocolSend } from './services';
import { handleMetaExport, handleMetaLoad, handleDirectSave, handleDirectLoad, handleClearAndReset, handleExportManifest, handleClearLog } from './persistence';

export async function handleSendMessage(
    inputEl: HTMLTextAreaElement,
    messagesEl: HTMLElement,
    buttonEl: HTMLButtonElement,
    history: ChatMessage[],
    processor: (history: ChatMessage[], thinkingBubble: HTMLElement) => Promise<void>
) {
    const prompt = inputEl.value.trim();
    if (!prompt) return;

    buttonEl.disabled = true;
    inputEl.value = '';
    autoExpandTextarea(inputEl);

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
    history.push(userMessage);
    
    const { createChatBubble } = await import('./ui');
    messagesEl.appendChild(createChatBubble('user', prompt));
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const thinkingBubble = createChatBubble('model', '', true);
    messagesEl.appendChild(thinkingBubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    await processor(history, thinkingBubble);
    
    buttonEl.disabled = false;
    inputEl.focus();
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

export function initializeCommands() {
    appState.commandPaletteCommands = [
        { id: 'tab-lia-assistant', name: 'View: LIA Helper', section: 'Navigation', action: () => switchTab('lia-assistant-tab') },
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
        { id: 'toggle-left-sidebar', name: 'Toggle: Left Sidebar', section: 'UI', action: () => dom.leftSidebar?.classList.toggle('collapsed') },
        { id: 'toggle-right-sidebar', name: 'Toggle: Right Sidebar', section: 'UI', action: () => dom.rightSidebar?.classList.toggle('collapsed') },
        { id: 'save-browser', name: 'Persist: Save to Browser', section: 'Persistence', action: handleDirectSave },
        { id: 'load-browser', name: 'Persist: Load from Browser', section: 'Persistence', action: handleDirectLoad },
        { id: 'export-state', name: 'Persist: Export State to File', section: 'Persistence', action: handleMetaExport },
        { id: 'import-state', name: 'Persist: Import State from File', section: 'Persistence', action: () => dom.metaLoadInput?.click() },
        { id: 'reset-lia', name: 'System: Reset LIA State', section: 'System', action: resetLiaState },
        { id: 'reset-app', name: 'System: Clear & Reset Application', section: 'System', keywords: 'delete wipe hard reset', action: handleClearAndReset },
    ];
}

export function initializeEventListeners() {
    dom.toggleSidebarButton?.addEventListener('click', () => {
        dom.leftSidebar?.classList.toggle('collapsed')
    });
    dom.toggleRightSidebarButton?.addEventListener('click', () => dom.rightSidebar?.classList.toggle('collapsed'));
    dom.collapseSidebarButton?.addEventListener('click', () => dom.leftSidebar?.classList.add('collapsed'));

    // VFS Sidebar Resizer
    if (dom.sidebarResizer && dom.leftSidebar) {
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = e.clientX;
            if (newWidth > 150 && newWidth < 800) { // Constraints for min/max width
                dom.leftSidebar!.style.setProperty('--sidebar-current-width', `${newWidth}px`);
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        dom.sidebarResizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    }

    dom.fileTree?.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const actionButton = target.closest<HTMLButtonElement>('.file-action-button');
        const fileItem = target.closest<HTMLElement>('.file-item');
        if (!fileItem) return;
        
        const fileName = fileItem.dataset.fileName;
        if (!fileName) return;

        // Handle action buttons
        if (actionButton) {
            e.stopPropagation(); // Prevent file switching when clicking a button
            const file = appState.vfsFiles.find(f => f.name === fileName);
            if (!file) return;

            const action = actionButton.dataset.action;
            switch(action) {
                case 'copy-content':
                    navigator.clipboard.writeText(file.content);
                    break;
                case 'copy-url':
                    navigator.clipboard.writeText(file.url);
                    break;
                case 'open-tab':
                    window.open(file.url, '_blank');
                    break;
            }
            return;
        }

        // Handle file selection
        if (appState.activeFile && dom.codeEditor) {
            updateActiveFileContent(dom.codeEditor.value);
        }
        await switchFile(fileName);
    });

    dom.codeEditor?.addEventListener('input', () => dom.codeEditor && updateActiveFileContent(dom.codeEditor.value));

    dom.tabNav?.addEventListener('click', async (e) => {
        const target = e.target as HTMLButtonElement;
        if (target.matches('.tab-button') && target.dataset.tabId) {
            await switchTab(target.dataset.tabId);
        }
    });

    document.getElementById('tab-content')?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.id === 'reset-state-button') {
            const button = target as HTMLButtonElement;
            if (button.dataset.confirm === 'true') {
                resetLiaState();
                if (appState.currentActiveTabId === 'system-state-tab') renderSystemState(false);
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

    dom.assetListContainer?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('.download-asset-button')) {
            const button = target as HTMLButtonElement;
            const { url, name } = button.dataset;
            if (url && name) {
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        }
    });

    window.addEventListener('message', (event) => {
        if (event.data?.type === 'LIA_STUDIO_REQUEST_FILES') {
            const iframeSource = Array.from(document.querySelectorAll('iframe')).find(iframe => iframe.contentWindow === event.source);
            if (iframeSource?.src.startsWith('blob:')) {
                const serializableFiles = appState.vfsFiles.map(f => ({ 
                    name: f.name, 
                    type: f.type, 
                    url: f.url,
                    size: formatBytes(f.size) 
                }));
                (event.source as Window).postMessage({ type: 'LIA_STUDIO_FILE_LIST', files: serializableFiles }, '*');
            }
        }
    });

    // Delegated listeners for dynamic content
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        // Tools protocol list
        if (target.closest('.protocol-item')) {
             const protocol = target.closest('.protocol-item')?.getAttribute('data-protocol');
             if (protocol) {
                 appState.activeToolProtocol = protocol as any;
                 renderToolsTab();
             }
        }

        // UI Command Search Results
        if (target.closest('.ui-command-item')) {
            const commandId = target.closest('.ui-command-item')?.getAttribute('data-command-id');
            const command = appState.commandPaletteCommands.find(c => c.id === commandId);
            if (command) {
                command.action();
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
    });

    // Delegated input listener for search
    document.body.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;

        // LIA Command Search
        if (target.id === 'lia-command-search-input') {
            const query = target.value.toLowerCase();
            const filtered = appState.liaCommandList.filter(cmd => {
                return cmd.name.toLowerCase().includes(query) ||
                       cmd.sig.toLowerCase().includes(query) ||
                       cmd.desc.toLowerCase().includes(query);
            });
            const resultsContainer = document.getElementById('lia-command-search-results');
            if (!resultsContainer) return;
            resultsContainer.innerHTML = '';

            if (filtered.length === 0) {
                resultsContainer.innerHTML = '<div class="lia-command-item"><p>No LIA commands found.</p></div>';
                return;
            }
            
            filtered.forEach(cmd => {
                const item = document.createElement('div');
                item.className = 'lia-command-item';
                item.innerHTML = `
                    <strong>${cmd.name}</strong> <code>(sig: ${cmd.sig})</code>
                    <p>${cmd.desc}</p>
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
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            switchTab('search-tab');
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