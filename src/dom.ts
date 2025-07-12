

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
export const caraEvolveButton = getElem<HTMLButtonElement>('cara-evolve-button');
export const caraDevolveButton = getElem<HTMLButtonElement>('cara-devolve-button');

// Metis HUD & Portal Elements
export const toggleMetisHudButton = getElem<HTMLButtonElement>('toggle-metis-hud');
export const launchMetisPortalButton = getElem<HTMLButtonElement>('launch-metis-portal');

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