/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- DOM Elements ---
const getElem = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

export const codeEditor = getElem<HTMLTextAreaElement>('code-editor');
export const codePreview = getElem<HTMLIFrameElement>('code-preview');
export const fileTree = getElem<HTMLElement>('file-tree');
export const tabNav = getElem<HTMLElement>('tab-nav');
export const systemStatePane = getElem<HTMLElement>('system-state-tab');
export const toolsPane = getElem<HTMLElement>('tools-tab');
export const tabContent = getElem<HTMLElement>('tab-content');

// LIA Kernel Tab Elements
export const liaKernelMessages = getElem<HTMLElement>('lia-kernel-messages');
export const liaOperatorSelect = getElem<HTMLSelectElement>('lia-operator-select');
export const liaKernelInput = getElem<HTMLTextAreaElement>('lia-kernel-input');
export const sendLiaKernelButton = getElem<HTMLButtonElement>('send-lia-kernel-button');

// LIA Assistant Tab Elements (New)
export const liaAssistantMessages = getElem<HTMLElement>('lia-assistant-messages');
export const liaAssistantInput = getElem<HTMLTextAreaElement>('lia-assistant-input');
export const sendLiaAssistantButton = getElem<HTMLButtonElement>('send-lia-assistant-button');

// Fs_Util Tab Elements
export const fsUtilMessages = getElem<HTMLElement>('fs-util-messages');
export const fsUtilInput = getElem<HTMLTextAreaElement>('fs-util-input');
export const sendFsUtilButton = getElem<HTMLButtonElement>('send-fs-util-button');

// Code Assistant Tab Elements (New)
export const codeAssistantMessages = getElem<HTMLElement>('code-assistant-messages');
export const codeAssistantInput = getElem<HTMLTextAreaElement>('code-assistant-input');
export const sendCodeAssistantButton = getElem<HTMLButtonElement>('send-code-assistant-button');

// Vanilla Chat Tab Elements
export const vanillaMessages = getElem<HTMLElement>('vanilla-messages');
export const vanillaChatInput = getElem<HTMLTextAreaElement>('vanilla-chat-input');
export const sendVanillaChatButton = getElem<HTMLButtonElement>('send-vanilla-chat-button');

// Cara Assistor Tab Elements
export const caraAssistorMessages = getElem<HTMLElement>('cara-assistor-messages');
export const caraAssistorInput = getElem<HTMLTextAreaElement>('cara-assistor-input');
export const sendCaraAssistorButton = getElem<HTMLButtonElement>('send-cara-assistor-button');
export const caraBootstrapSelect = getElem<HTMLSelectElement>('cara-bootstrap-select');

// Search Tab Elements
export const searchTabPane = getElem<HTMLElement>('search-tab');

// VFS Shell Elements
export const vfsShellTab = getElem<HTMLElement>('vfs-shell-tab');
export const vfsShellOutput = getElem<HTMLElement>('vfs-shell-output');
export const vfsShellInput = getElem<HTMLInputElement>('vfs-shell-input');
export const vfsViEditorOverlay = getElem<HTMLElement>('vfs-vi-editor-overlay');
export const vfsViFilename = getElem<HTMLElement>('vfs-vi-filename');
export const vfsViTextarea = getElem<HTMLTextAreaElement>('vfs-vi-textarea');

// Sidebars
export const leftSidebar = getElem<HTMLElement>('left-sidebar');
export const rightSidebar = getElem<HTMLElement>('right-sidebar');
export const toggleSidebarButton = getElem<HTMLButtonElement>('toggle-sidebar');
export const toggleRightSidebarButton = getElem<HTMLButtonElement>('toggle-right-sidebar');
export const collapseSidebarButton = getElem<HTMLButtonElement>('collapse-sidebar-button');
export const sidebarResizer = getElem<HTMLElement>('sidebar-resizer');

// Persistence Tools Elements
export const metaExportButton = getElem<HTMLButtonElement>('meta-export-button');
export const metaLoadTrigger = getElem<HTMLButtonElement>('meta-load-trigger');
export const metaLoadInput = getElem<HTMLInputElement>('meta-load-input');
export const metaSaveNameInput = getElem<HTMLInputElement>('meta-save-name');
export const directSaveButton = getElem<HTMLButtonElement>('direct-save-button');
export const directLoadButton = getElem<HTMLButtonElement>('direct-load-button');
export const clearStateButton = getElem<HTMLButtonElement>('clear-state-button');
export const persistenceLogEl = getElem<HTMLElement>('persistence-log');
export const exportManifestButton = getElem<HTMLButtonElement>('export-manifest-button');
export const assetListContainer = getElem<HTMLElement>('asset-list-container');
export const clearLogButton = getElem<HTMLButtonElement>('clear-log-button');
export const syncStateButton = getElem<HTMLButtonElement>('sync-state-button');

export const aiSettingsControls = {
    model: getElem<HTMLSelectElement>('ai-model-select'),
    temperatureSlider: getElem<HTMLInputElement>('temperature-slider'),
    temperatureInput: getElem<HTMLInputElement>('temperature-input'),
    maxTokensSlider: getElem<HTMLInputElement>('max-output-tokens-slider'),
    maxTokensInput: getElem<HTMLInputElement>('max-output-tokens-input'),
    topPSlider: getElem<HTMLInputElement>('top-p-slider'),
    topPInput: getElem<HTMLInputElement>('top-p-input'),
    topKSlider: getElem<HTMLInputElement>('top-k-slider'),
    topKInput: getElem<HTMLInputElement>('top-k-input'),
};
export const settingsGroupHeaders = document.querySelectorAll<HTMLElement>('.settings-group-header');

// Cara HUD & LIA State Elements
export const toggleCaraHudButton = getElem<HTMLButtonElement>('toggle-cara-hud');
export const toggleKernelHudButton = getElem<HTMLButtonElement>('toggle-kernel-hud');
export const toggleMetisHudButton = getElem<HTMLButtonElement>('toggle-metis-hud');
export const caraEvolveButton = getElem<HTMLButtonElement>('cara-evolve-button');
export const caraDevolveButton = getElem<HTMLButtonElement>('cara-devolve-button');

// Portal Launch Buttons
export const launchLiaPortalButton = getElem<HTMLButtonElement>('launch-lia-portal');
export const launchMetisPortalButton = getElem<HTMLButtonElement>('launch-metis-portal');
export const launchPupaPortalButton = getElem<HTMLButtonElement>('launch-pupa-portal');

// Editor Pane
export const editorPaneTextarea = getElem<HTMLTextAreaElement>('editor-pane-textarea');
export const editorToolbar = getElem<HTMLElement>('editor-toolbar');
export const editorCopyButton = getElem<HTMLButtonElement>('editor-copy-button');
export const editorPasteButton = getElem<HTMLButtonElement>('editor-paste-button');
export const editorCutButton = getElem<HTMLButtonElement>('editor-cut-button');
export const editorSaveFilenameInput = getElem<HTMLInputElement>('editor-save-filename-input');
export const editorSaveButton = getElem<HTMLButtonElement>('editor-save-button');
export const editorOpenSelect = getElem<HTMLSelectElement>('editor-open-select');
export const editorOpenButton = getElem<HTMLButtonElement>('editor-open-button');
export const editorWarningBanner = getElem<HTMLElement>('editor-warning-banner');
export const editorWarningClose = getElem<HTMLElement>('editor-warning-close');

// LIA Modal Elements
export const liaModalOverlay = getElem<HTMLElement>('lia-modal-overlay');
export const liaModalCloseButton = getElem<HTMLButtonElement>('lia-modal-close');
export const liaModalTabNav = getElem<HTMLElement>('lia-modal-tab-nav');
export const liaModalTabContent = getElem<HTMLElement>('lia-modal-tab-content');
export const liaPanopticonTab = getElem<HTMLElement>('lia-panopticon-tab');
export const liaKernelLogTab = getElem<HTMLElement>('lia-kernel-log-tab');
export const liaKernelLogMessages = getElem<HTMLElement>('lia-kernel-log-messages');
export const liaGrimoireTab = getElem<HTMLElement>('lia-grimoire-tab');
export const liaCompendiumTab = getElem<HTMLElement>('lia-compendium-tab');
export const liaNexusTab = getElem<HTMLElement>('lia-nexus-tab');
export const liaEntitiesTab = getElem<HTMLElement>('lia-entities-tab');
export const liaVfsShellTab = getElem<HTMLElement>('lia-vfs-shell-tab');
export const liaEditorTab = getElem<HTMLElement>('lia-editor-tab');
export const liaVfsShellContainer = getElem<HTMLElement>('lia-vfs-shell-container');
export const liaVfsShellOutput = getElem<HTMLElement>('lia-vfs-shell-output');
export const liaVfsShellInput = getElem<HTMLInputElement>('lia-vfs-shell-input');
export const liaEditorToolbar = getElem<HTMLElement>('lia-editor-toolbar');
export const liaEditorOpenSelect = getElem<HTMLSelectElement>('lia-editor-open-select');
export const liaEditorOpenButton = getElem<HTMLButtonElement>('lia-editor-open-button');
export const liaEditorSaveFilenameInput = getElem<HTMLInputElement>('lia-editor-save-filename-input');
export const liaEditorSaveButton = getElem<HTMLButtonElement>('lia-editor-save-button');
export const liaEditorTextarea = getElem<HTMLTextAreaElement>('lia-editor-textarea');
export const launchKSphereModalButton = getElem<HTMLButtonElement>('launch-ksphere-modal-button');
export const launchLiaMetisPortalButton = getElem<HTMLButtonElement>('launch-lia-metis-portal-button');
export const launchLiaPupaPortalButton = getElem<HTMLButtonElement>('launch-lia-pupa-portal-button');

// Metis Modal Elements
export const metisModalOverlay = getElem<HTMLElement>('metis-modal-overlay');
export const metisModalCloseButton = getElem<HTMLButtonElement>('metis-modal-close');
export const metisModalTabNav = getElem<HTMLElement>('metis-modal-tab-nav');
export const metisModalTabContent = getElem<HTMLElement>('metis-modal-tab-content');
export const metisPanopticonTab = getElem<HTMLElement>('metis-panopticon-tab');
export const metisGrimoireTab = getElem<HTMLElement>('metis-grimoire-tab');
export const metisCompendiumTab = getElem<HTMLElement>('metis-compendium-tab');
export const metisVfsAnalysisContent = getElem<HTMLElement>('vfs-analysis-content-modal');
export const metisAnomalousLog = getElem<HTMLElement>('anomalous-log-modal');
export const metisChatMessagesModal = getElem<HTMLElement>('metis-chat-messages-modal');
export const metisChatInputModal = getElem<HTMLTextAreaElement>('metis-chat-input-modal');
export const sendMetisChatButtonModal = getElem<HTMLButtonElement>('send-metis-chat-button-modal');

// Pupa Modal Elements
export const pupaModalOverlay = getElem<HTMLElement>('pupa-modal-overlay');
export const pupaModalCloseButton = getElem<HTMLButtonElement>('pupa-modal-close');
export const pupaModalTabNav = getElem<HTMLElement>('pupa-modal-tab-nav');
export const pupaModalTabContent = getElem<HTMLElement>('pupa-modal-tab-content');
export const pupaPanopticonTab = getElem<HTMLElement>('pupa-panopticon-tab');
export const pupaGrimoireTab = getElem<HTMLElement>('pupa-grimoire-tab');
export const pupaCompendiumTab = getElem<HTMLElement>('pupa-compendium-tab');
export const pupaVfsAnalysisContent = getElem<HTMLElement>('vfs-analysis-content-pupa-modal');
export const pupaAnomalousLog = getElem<HTMLElement>('anomalous-log-pupa-modal');
export const pupaChatMessagesModal = getElem<HTMLElement>('pupa-chat-messages-modal');
export const pupaChatInputModal = getElem<HTMLTextAreaElement>('pupa-chat-input-modal');
export const sendPupaChatButtonModal = getElem<HTMLButtonElement>('send-pupa-chat-button-modal');

// K-Sphere Modal Elements
export const ksphereModalOverlay = getElem<HTMLElement>('ksphere-modal-overlay');
export const ksphereModalCloseButton = getElem<HTMLButtonElement>('ksphere-modal-close');
export const ksphereModalContent = getElem<HTMLElement>('ksphere-modal-main-content');