/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
// No longer importing GoogleGenAI, Type from "@google/genai"
import { marked } from "https://esm.run/marked";
import DOMPurify from "https://esm.run/dompurify";

// --- Type Definitions ---
interface VFSFile {
  name: string;
  content: string;
  active: boolean;
}
type LiaState = { [key: string]: number | string };
type LiaMetricDefinition = { id: string, name: string, value_initial: number, range: [number, number], description: string, dynamics_notes?: string, critical_threshold?: number };
type LiaQualitativeDefinition = { id: string, name: string, initial_value: string, description: string };
type LiaBootstrap = {
  SYSTEM_STATE_METRICS: { metrics: LiaMetricDefinition[] };
  SYSTEM_STATE_QUALITATIVE: { states: LiaQualitativeDefinition[] };
  EMBEDDED_SYSTEM_PROMPTS: { protocols: { LIA_Kernel: { prompt_template: string }, Fs_Util: { prompt_template: string } } };
};

// LiteLLM compatible ChatMessage
type LiteLLMChatMessage = {
    role: 'system' | 'user' | 'assistant' | 'tool'; // Added 'tool' and 'system' for LiteLLM
    content: string;
    // tool_calls and tool_call_id are optional for more advanced scenarios
    tool_calls?: Array<{ id: string, type: 'function', function: { name: string, arguments: string } }>;
    tool_call_id?: string;
};

type AiSettings = {
  model: string; // This will now be the LiteLLM model string e.g., "ollama/llama2"
  temperature: number;
  max_tokens: number; // Changed from maxOutputTokens
  topP: number;
  topK: number; // Though top_k is common, LiteLLM might use it or not depending on model
  stream: boolean; // Added for LiteLLM
  expandedGroups: { [key: string]: boolean };
  expandedFolders: { [key: string]: boolean };
};

// --- DOM Elements ---
const getElem = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const codeEditor = getElem<HTMLTextAreaElement>('code-editor');
const fileTree = getElem<HTMLElement>('file-tree');
const tabNav = getElem<HTMLElement>('tab-nav');
const systemStatePane = getElem<HTMLElement>('system-state-tab');
const liaChatMessages = getElem<HTMLElement>('chat-messages');
const liaChatInput = getElem<HTMLTextAreaElement>('chat-input');
const sendLiaChatButton = getElem<HTMLButtonElement>('send-chat-button');
const codeChatMessages = getElem<HTMLElement>('code-chat-messages');
const codeChatInput = getElem<HTMLTextAreaElement>('code-chat-input');
const sendCodeChatButton = getElem<HTMLButtonElement>('send-code-chat-button');
const leftSidebar = getElem<HTMLElement>('left-sidebar');
const rightSidebar = getElem<HTMLElement>('right-sidebar');
const toggleSidebarButton = getElem<HTMLButtonElement>('toggle-sidebar');
const toggleRightSidebarButton = getElem<HTMLButtonElement>('toggle-right-sidebar');
const collapseSidebarButton = getElem<HTMLButtonElement>('collapse-sidebar-button');

const saveProjectButton = getElem<HTMLButtonElement>('save-project-button');
const deployKernelButton = getElem<HTMLButtonElement>('deploy-kernel-button');
const downloadArtifactButton = getElem<HTMLButtonElement>('download-artifact-button');
const shareDmesgButton = getElem<HTMLButtonElement>('share-dmesg-button');

const aiSettingsControls = {
  model: getElem<HTMLSelectElement>('ai-model-select'),
  temperatureSlider: getElem<HTMLInputElement>('temperature-slider'),
  temperatureInput: getElem<HTMLInputElement>('temperature-input'),
  maxTokensSlider: getElem<HTMLInputElement>('max-output-tokens-slider'), // UI ID remains the same
  maxTokensInput: getElem<HTMLInputElement>('max-output-tokens-input'),   // UI ID remains the same
  topPSlider: getElem<HTMLInputElement>('top-p-slider'),
  topPInput: getElem<HTMLInputElement>('top-p-input'),
  topKSlider: getElem<HTMLInputElement>('top-k-slider'),
  topKInput: getElem<HTMLInputElement>('top-k-input'),
};
const settingsGroupHeaders = document.querySelectorAll<HTMLElement>('.settings-group-header');

// --- State Variables ---
let isSwitchingTabs = false;
let currentActiveTabId = 'code-editor-tab';
let vfsFiles: VFSFile[] = [];
let liaChatHistory: LiteLLMChatMessage[] = [];
let codeChatHistory: LiteLLMChatMessage[] = [];
// Initialize activeLiaBootstrapFilename with the new default.
let activeLiaBootstrapFilename: string = 'public/LIA_0001_MASTER_BOOTSTRAP_v7.0_Absolute_Kernel_Root_Edition.json';

let aiSettings: AiSettings = {
  model: 'ollama/codellama',
  temperature: 0.7,
  max_tokens: 2048,
  topP: 0.9,
  topK: 40,
  stream: true,
  expandedGroups: {},
  expandedFolders: { 'public': true, 'lia_system': true, 'boot': true, 'etc': true, 'lib': true, 'sbin': true, 'usr': true, 'var': true, 'dev': true, 'home': true, 'mnt': true, 'opt': true, 'proc': true, 'root': true, 'sys': true, 'tmp': true }
};
let liaState: LiaState = {};
let apiKey: string | undefined = process.env.GEMINI_API_KEY;

// Updated to point to the v7.0 named file, which holds v7.1 content per instructions
const DEFAULT_LIA_BOOTSTRAP_FILENAME = 'public/LIA_0001_MASTER_BOOTSTRAP_v7.0_Absolute_Kernel_Root_Edition.json';
const CONCEPTUAL_FOLDER_PREFIXES = ['public', 'lia_system', 'bin', 'sbin', 'etc', 'dev', 'proc', 'sys', 'lib', 'boot', 'usr', 'var', 'mnt', 'opt', 'tmp', 'home', 'root'];

const defaultVfsFiles: VFSFile[] = [
  { name: 'index.html', content: `<!DOCTYPE html>
<html>
<head>
 <title>LIA Kernel Init</title>
 <meta charset="utf-8" />
 <meta name="viewport" content="width=device-width, initial-scale=1" />
 <link rel="stylesheet" href="style.css">
</head>
<body>
 <h1>LIA Kernel Mounted Root (/)</h1>
 <p>The conceptual filesystem is active. Explore '/proc' for kernel metrics.</p>
 <div id="app-root"></div>
 <script src="script.js"></script>
</body>
</html>`, active: true },
  { name: 'style.css', content: `body {
 font-family: 'Fira Code', monospace;
 background-color: #282c34;
 color: #abb2bf;
 padding: 2rem;
 display: flex;
 flex-direction: column;
 align-items: center;
}
h1 { color: #61afef; }
p { color: #98c379; }`, active: false },
  { name: 'script.js', content: `// conceptual_syscall.js
console.log("Kernel booting up... PID 1 active.");
const root = document.getElementById('app-root');
if (root) {
 root.innerHTML = '<p><code>/bin/init</code> process launched successfully.</p>';
}
// Try running 'ls /proc' in the Fs_Util tab!`, active: false },
  { name: DEFAULT_LIA_BOOTSTRAP_FILENAME, content: `{}`, active: false },
];

marked.use({
  highlight: (code: string, lang: string) => {
    const language = lang || 'plaintext';
    return `<pre><code class="language-${language}">${code}</code></pre>`;
  },
});

// --- Initialization ---
async function main() {
  await loadState();
  initializeEventListeners();
  renderFileTree();

  const ensureBootstrapFileContent = async (filename: string): Promise<string> => {
    let vfsFileEntry = vfsFiles.find(f => f.name === filename);
    if (vfsFileEntry && vfsFileEntry.content !== "{}") {
      return vfsFileEntry.content;
    }
    try {
      console.log(`Fetching content for bootstrap: ${filename}`);
      const fetchedContent = await fetch(filename).then(res => {
        if (!res.ok) throw new Error(`Failed to fetch ${filename}: ${res.statusText}`);
        return res.text();
      });
      if (vfsFileEntry) {
        vfsFileEntry.content = fetchedContent;
      } else {
        vfsFiles.push({ name: filename, content: fetchedContent, active: false });
      }
      console.log(`Successfully fetched and updated VFS for ${filename}`);
      return fetchedContent;
    } catch (err) {
      console.error(`Failed to fetch content for bootstrap ${filename}:`, err);
      if (vfsFileEntry) vfsFileEntry.content = "{}";
      else vfsFiles.push({ name: filename, content: "{}", active: false});
      return "{}";
    }
  };

  await ensureBootstrapFileContent(DEFAULT_LIA_BOOTSTRAP_FILENAME);

  if (activeLiaBootstrapFilename !== DEFAULT_LIA_BOOTSTRAP_FILENAME) {
    await ensureBootstrapFileContent(activeLiaBootstrapFilename);
  }

  if (Object.keys(liaState).length === 0 || !liaState.KCS) {
    resetLiaStateToActiveBootstrap();
  }

  await switchFile(getActiveFile()?.name || 'index.html');
}

async function loadState() {
  const savedVfs = localStorage.getItem('lia_vfs');
  const savedLiaState = localStorage.getItem('lia_liaState');
  const savedLiaChat = localStorage.getItem('lia_liaChatHistory');
  const savedCodeChat = localStorage.getItem('lia_codeChatHistory');
  const savedSettings = localStorage.getItem('lia_aiSettings');
  const savedActiveBootstrap = localStorage.getItem('lia_activeLiaBootstrapFilename');

  activeLiaBootstrapFilename = savedActiveBootstrap || DEFAULT_LIA_BOOTSTRAP_FILENAME;

  if (savedVfs) {
    const diskFiles: VFSFile[] = JSON.parse(savedVfs);
    const vfsMap = new Map(diskFiles.map(f => [f.name, f]));

    vfsFiles = defaultVfsFiles.map(defaultFile => {
      const storedFile = vfsMap.get(defaultFile.name);
      if (storedFile) {
        return defaultFile.name.endsWith('.json')
               ? { ...defaultFile, content: "{}", active: storedFile.active }
               : { ...storedFile };
      }
      return defaultFile.name.endsWith('.json') ? {...defaultFile, content: "{}"} : defaultFile;
    });

    diskFiles.forEach(diskFile => {
      if (!vfsFiles.some(vf => vf.name === diskFile.name)) {
        vfsFiles.push(diskFile.name.endsWith('.json') ? {...diskFile, content: "{}"} : diskFile);
      }
    });
  } else {
    vfsFiles = defaultVfsFiles.map(f => f.name.endsWith('.json') ? {...f, content: "{}"} : f);
  }

  if (!vfsFiles.some(f => f.name === activeLiaBootstrapFilename) && activeLiaBootstrapFilename.endsWith('.json')) {
    vfsFiles.push({ name: activeLiaBootstrapFilename, content: "{}", active: false });
  }

  liaState = savedLiaState ? JSON.parse(savedLiaState) : {};
  liaChatHistory = savedLiaChat ? JSON.parse(savedLiaChat) : [];
  codeChatHistory = savedCodeChat ? JSON.parse(savedCodeChat) : [];

  if (savedSettings) {
    const parsedSettings = JSON.parse(savedSettings);
    if (parsedSettings.maxOutputTokens && !parsedSettings.max_tokens) {
        parsedSettings.max_tokens = parsedSettings.maxOutputTokens;
        delete parsedSettings.maxOutputTokens;
    }
    aiSettings = { ...aiSettings, ...parsedSettings };
  }

  if (aiSettingsControls.model) aiSettingsControls.model.value = aiSettings.model;
  if (aiSettingsControls.temperatureSlider) aiSettingsControls.temperatureSlider.value = String(aiSettings.temperature);
  if (aiSettingsControls.temperatureInput) aiSettingsControls.temperatureInput.value = String(aiSettings.temperature);
  if (aiSettingsControls.maxTokensSlider) aiSettingsControls.maxTokensSlider.value = String(aiSettings.max_tokens);
  if (aiSettingsControls.maxTokensInput) aiSettingsControls.maxTokensInput.value = String(aiSettings.max_tokens);
  if (aiSettingsControls.topPSlider) aiSettingsControls.topPSlider.value = String(aiSettings.topP);
  if (aiSettingsControls.topPInput) aiSettingsControls.topPInput.value = String(aiSettings.topP);
  if (aiSettingsControls.topKSlider) aiSettingsControls.topKSlider.value = String(aiSettings.topK);
  if (aiSettingsControls.topKInput) aiSettingsControls.topKInput.value = String(aiSettings.topK);

  settingsGroupHeaders.forEach(header => {
      const group = header.dataset.group;
      if(group && aiSettings.expandedGroups[group]) {
          header.classList.add('expanded');
          header.nextElementSibling?.classList.add('expanded');
      }
  });
}

function saveState() {
  localStorage.setItem('lia_vfs', JSON.stringify(vfsFiles));
  localStorage.setItem('lia_liaState', JSON.stringify(liaState));
  localStorage.setItem('lia_liaChatHistory', JSON.stringify(liaChatHistory));
  localStorage.setItem('lia_codeChatHistory', JSON.stringify(codeChatHistory));
  localStorage.setItem('lia_aiSettings', JSON.stringify(aiSettings));
  localStorage.setItem('lia_activeLiaBootstrapFilename', activeLiaBootstrapFilename);
}

function resetLiaStateToActiveBootstrap() {
  try {
    console.log(`Resetting LIA state using bootstrap: ${activeLiaBootstrapFilename}`);
    const bootstrapFileContent = getFileContent(activeLiaBootstrapFilename);
    if (!bootstrapFileContent || bootstrapFileContent === "{}") {
        throw new Error(`Content for ${activeLiaBootstrapFilename} not loaded into VFS. Ensure it's fetched before reset.`);
    }
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFileContent);
    const newLiaState: LiaState = {};
    const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
    const qualitativeStates = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];
    metrics.forEach(metric => newLiaState[metric.id] = metric.value_initial);
    qualitativeStates.forEach(state => newLiaState[state.id] = state.initial_value);
    liaState = newLiaState;
  } catch (e: any) {
    console.error("Failed to reset LIA state:", e.message, e.stack);
    liaState = { KCS: 0.0, PSS: 0.0, ERROR: 1, MESSAGE: e.message };
  }
}

const getFileContent = (name: string) => vfsFiles.find(f => f.name === name)?.content;
const getActiveFile = () => vfsFiles.find(f => f.active);

async function switchFile(name: string) {
  vfsFiles.forEach(f => f.active = (f.name === name));
  const newActiveFile = getActiveFile();
  if (codeEditor && newActiveFile) {
    codeEditor.value = newActiveFile.content;
  }
  renderFileTree();
  await switchTab('code-editor-tab');
}

function updateActiveFileContent(newContent: string) {
  const activeFile = getActiveFile();
  if (activeFile) activeFile.content = newContent;
}

function renderFileTree() {
  if (!fileTree) return;
  fileTree.innerHTML = '';
  const folders: { [key: string]: VFSFile[] } = {};
  const rootFiles: VFSFile[] = [];
  vfsFiles.forEach(file => {
      let foundFolder = false;
      for (const prefix of CONCEPTUAL_FOLDER_PREFIXES) {
          if (file.name.startsWith(prefix + '/') || file.name === prefix) {
              if (!folders[prefix]) folders[prefix] = [];
              folders[prefix].push(file);
              foundFolder = true;
              break;
          }
      }
      if (!foundFolder) rootFiles.push(file);
  });
  rootFiles.forEach(file => fileTree.appendChild(createFileElement(file)));
  for (const folderName of Object.keys(folders).sort()) {
      const folderFiles = folders[folderName];
      if (folderFiles.length > 0) {
          const isExpanded = aiSettings.expandedFolders[folderName];
          const folderHeader = document.createElement('div');
          folderHeader.className = `folder-header ${isExpanded ? 'expanded' : ''}`;
          folderHeader.innerHTML = `<span class="folder-toggle">▶</span> ${folderName}`;
          const folderContent = document.createElement('div');
          folderContent.className = `folder-content ${isExpanded ? '' : 'collapsed'}`;
          folderFiles.forEach(file => folderContent.appendChild(createFileElement(file, folderName)));
          folderHeader.addEventListener('click', () => {
              aiSettings.expandedFolders[folderName] = !aiSettings.expandedFolders[folderName];
              folderHeader.classList.toggle('expanded');
              folderContent.classList.toggle('collapsed');
              saveState();
          });
          fileTree.appendChild(folderHeader);
          fileTree.appendChild(folderContent);
      }
  }
}

function createFileElement(file: VFSFile, folderName?: string) {
  const el = document.createElement('div');
  el.className = 'file-item' + (file.active ? ' active' : '');
  el.textContent = file.name.split('/').pop() || file.name;
  el.dataset.fileName = file.name;
  return el;
}

async function switchTab(tabId: string) {
  if (isSwitchingTabs || currentActiveTabId === tabId) return;
  isSwitchingTabs = true;
  try {
    currentActiveTabId = tabId;
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.toggle('active', (btn as HTMLElement).dataset.tabId === tabId));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.toggle('active', pane.id === tabId));
    renderActiveTabContent();
    saveState();
  } catch(e) { console.error(`Failed to switch to tab ${tabId}:`, e); }
  finally { isSwitchingTabs = false; }
}

function renderActiveTabContent() {
  switch(currentActiveTabId) {
    case 'system-state-tab': renderSystemState(false); break;
    case 'ai-assistant-tab': renderChatHistory(liaChatMessages!, liaChatHistory); break;
    case 'code-assistant-tab': renderChatHistory(codeChatMessages!, codeChatHistory); break;
  }
}

function renderSystemState(wasUpdated = false) {
  if (!systemStatePane) return;
  try {
    const bootstrapFileContent = getFileContent(activeLiaBootstrapFilename);
    if (!bootstrapFileContent || bootstrapFileContent === "{}") {
      systemStatePane.innerHTML = `<p>ALERT: Bootstrap file '${activeLiaBootstrapFilename}' not found or empty - Kernel State Undetermined.</p>`;
      return;
    }
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFileContent);
    const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
    const qualitativeStates = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];
    const metricsHTML = metrics.map(metric => {
      const value = liaState[metric.id] ?? metric.value_initial;
      const range = metric.range || [0.0, 1.0];
      const normalizedValue = typeof value === 'number' ? value : metric.value_initial;
      const percentage = Math.max(0, Math.min(100, ((normalizedValue - range[0]) / (range[1] - range[0])) * 100));
      return `<div class="metric-item">
          <div class="metric-header">
            <span class="metric-label">${metric.name} (${metric.id.toUpperCase()})</span>
            <span class="metric-value">${typeof value === 'number' ? value.toFixed(3) : value}</span>
          </div>
          <div class="metric-bar-container"><div class="metric-bar" style="width: ${percentage}%;"></div></div>
          <p class="metric-description">${metric.description || ''}</p>
        </div>`;
    }).join('');
    const qualitativeHTML = qualitativeStates.map(state => {
      const value = liaState[state.id] ?? state.initial_value;
      return `<div class="qualitative-item">
          <span class="qualitative-label">${state.name}</span>
          <span class="qualitative-value">${value}</span>
        </div>`;
    }).join('');
    systemStatePane.innerHTML = `<div class="system-state-header">
        <button id="reset-state-button" class="toolbar-button" title="Reset all state to initial values">Reset Kernel State (init)&nbsp;&nbsp;<span style="font-size: 0.8em;">(double click to confirm)</span></button>
      </div>
      <h2 class="state-section-header">Quantitative Kernel Metrics</h2>
      <div class="metric-grid" ${wasUpdated ? 'data-flash="true"' : ''}>${metricsHTML}</div>
      <h2 class="state-section-header">Qualitative Kernel States</h2>
      <div class="qualitative-grid">${qualitativeHTML}</div>`;
    const grid = systemStatePane.querySelector('[data-flash="true"]');
    if (grid) {
      grid.classList.add('flash');
      setTimeout(() => { grid.classList.remove('flash'); grid.removeAttribute('data-flash'); }, 500);
    }
  } catch (e: any) {
    systemStatePane.innerHTML = `<p>WARNING: Error rendering kernel state from '${activeLiaBootstrapFilename}': ${e.message}</p><pre>${e.stack}</pre>`;
    console.error(e);
  }
}

function createChatBubble(role: 'user' | 'assistant' | 'error' | 'model', text: string, thinking = false): HTMLElement {
    const bubble = document.createElement('div');
    const displayRole = (role === 'model') ? 'assistant' : role;
    bubble.classList.add('chat-bubble', displayRole === 'assistant' ? 'ai' : 'user');

    if (role === 'error') {
        bubble.classList.add('ai', 'error');
        bubble.textContent = `KERNEL MESSAGE (ERROR): ${text}`;
    } else if (thinking) {
        bubble.classList.add('thinking');
        bubble.textContent = 'Kernel is processing...';
    } else {
        bubble.innerHTML = DOMPurify.sanitize(marked.parse(text));
    }
    return bubble;
}

function renderChatHistory(messagesEl: HTMLElement, history: LiteLLMChatMessage[]) {
    messagesEl.innerHTML = '';
    history.forEach(msg => messagesEl.appendChild(createChatBubble(msg.role, msg.content)));
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function handleSendMessage(
  inputEl: HTMLTextAreaElement,
  messagesEl: HTMLElement,
  buttonEl: HTMLButtonElement,
  chatHistory: LiteLLMChatMessage[],
  aiProcessor: (history: LiteLLMChatMessage[], thinkingBubble: HTMLElement) => Promise<void>
) {
  if (!inputEl.value.trim()) return;
  const userInput = inputEl.value.trim();
  inputEl.value = '';
  inputEl.style.height = 'auto';
  inputEl.disabled = true;
  buttonEl.disabled = true;

  chatHistory.push({ role: 'user', content: userInput });
  renderChatHistory(messagesEl, chatHistory);

  const thinkingBubble = createChatBubble('assistant', '', true);
  messagesEl.appendChild(thinkingBubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  try {
    await aiProcessor(chatHistory, thinkingBubble);
  } catch (e: any) {
    console.error("AI processing failed", e);
    thinkingBubble.remove();
    messagesEl.appendChild(createChatBubble('error', e.message || 'An unknown kernel panic occurred.'));
  } finally {
    inputEl.disabled = false;
    buttonEl.disabled = false;
    inputEl.focus();
    messagesEl.scrollTop = messagesEl.scrollHeight;
    saveState();
  }
}

async function fetchLiteLLM(payload: any, stream = false): Promise<any> {
    const response = await fetch('/litellm/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LiteLLM API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }
    return stream ? response.body : response.json();
}

async function processLiaResponse(history: LiteLLMChatMessage[], thinkingBubble: HTMLElement) {
    const bootstrapFileContent = getFileContent(activeLiaBootstrapFilename);
    if (!bootstrapFileContent || bootstrapFileContent === "{}") throw new Error(`LIA Bootstrap file '${activeLiaBootstrapFilename}' not found or empty for processing.`);
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFileContent);
    let systemPromptTemplate = bootstrap.EMBEDDED_SYSTEM_PROMPTS.protocols.LIA_Kernel.prompt_template;
    const userMessage = history.findLast(m => m.role === 'user');
    if (!userMessage) throw new Error("No user message in history for LIA.");

    const userPrompt = userMessage.content;
    const operator = userPrompt.split(' ')[0] || 'init';
    const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
    const qualitativeStates = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];
    const allStates = [...metrics, ...qualitativeStates];
    const stateString = allStates.map(s => `${s.id.toUpperCase()}: ${typeof liaState[s.id] === 'number' ? (liaState[s.id] as number).toFixed(3) : liaState[s.id]}`).join(', ');
    let systemGeneratedPrompt = systemPromptTemplate.replace('%%STATE_STRING%%', stateString).replace('%%OPERATOR%%', operator).replace('%%USER_PROMPT%%', userPrompt);

    const messages: LiteLLMChatMessage[] = [{ role: 'system', content: systemGeneratedPrompt }, ...history.slice(0, -1), { role: 'user', content: userPrompt }];
    const payload = { model: aiSettings.model, messages, temperature: aiSettings.temperature, max_tokens: aiSettings.max_tokens, top_p: aiSettings.topP, stream: false };

    try {
        const result = await fetchLiteLLM(payload, false);
        let responseContent = result.choices[0]?.message?.content;
        if (!responseContent) throw new Error("LiteLLM LIA response missing content.");
        const parsedResponse = JSON.parse(responseContent);

        if (parsedResponse.kernel_log && parsedResponse.new_kernel_state) {
            for (const key in parsedResponse.new_kernel_state) {
                if (Object.prototype.hasOwnProperty.call(parsedResponse.new_kernel_state, key)) {
                    liaState[key] = typeof liaState[key] === 'number' && typeof parsedResponse.new_kernel_state[key] === 'string' ? parseFloat(parsedResponse.new_kernel_state[key]) : parsedResponse.new_kernel_state[key];
                }
            }
            history.push({ role: 'assistant', content: parsedResponse.kernel_log });
            thinkingBubble.replaceWith(createChatBubble('assistant', parsedResponse.kernel_log));
            if (currentActiveTabId === 'system-state-tab') renderSystemState(true);
        } else {
            throw new Error("LIA Kernel JSON from LiteLLM missing 'kernel_log' or 'new_kernel_state'.");
        }
    } catch (error: any) {
        console.error("LiteLLM LIA processing error:", error);
        thinkingBubble.remove();
        liaChatMessages?.appendChild(createChatBubble('error', `LIA Kernel Error: ${error.message}`));
        history.push({ role: 'assistant', content: `Error: ${error.message}` });
    }
}

async function processCodeAssistantResponse(history: LiteLLMChatMessage[], thinkingBubble: HTMLElement) {
    const bootstrapFileContent = getFileContent(activeLiaBootstrapFilename);
    if (!bootstrapFileContent || bootstrapFileContent === "{}") throw new Error(`LIA Bootstrap for Fs_Util from '${activeLiaBootstrapFilename}' not found or empty.`);
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFileContent);
    let systemPromptTemplate = bootstrap.EMBEDDED_SYSTEM_PROMPTS.protocols.Fs_Util.prompt_template;
    const userMessage = history.findLast(m => m.role === 'user');
    if (!userMessage) throw new Error("No user message in Fs_Util history.");

    const userPrompt = userMessage.content;
    const fileManifest = vfsFiles.map(f => `${f.name} (${f.content.length} bytes)`).join('\n');
    let systemGeneratedPrompt = systemPromptTemplate.replace('%%PROMPT%%', userPrompt).replace('%%FILE_MANIFEST%%', fileManifest);
    const messages: LiteLLMChatMessage[] = [{ role: 'system', content: systemGeneratedPrompt }, ...history.slice(0, -1), { role: 'user', content: userPrompt }];
    const payload = { model: aiSettings.model, messages, temperature: aiSettings.temperature, max_tokens: aiSettings.max_tokens, stream: aiSettings.stream };

    let accumulatedJson = '';
    try {
        if (aiSettings.stream) {
            const stream = await fetchLiteLLM(payload, true);
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let thinkingContent = '';
            thinkingBubble.innerHTML = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr.trim() === '[DONE]') break;
                        try {
                            const parsedChunk = JSON.parse(jsonStr);
                            const deltaContent = parsedChunk.choices?.[0]?.delta?.content;
                            if (deltaContent) {
                                accumulatedJson += deltaContent;
                                thinkingContent += deltaContent;
                                thinkingBubble.innerHTML = DOMPurify.sanitize(marked.parse(thinkingContent));
                                if(codeChatMessages) codeChatMessages.scrollTop = codeChatMessages.scrollHeight;
                            }
                        } catch (e) {
                           if (!jsonStr.includes("choices") && !jsonStr.includes("delta") && jsonStr.trim() !== "") {
                                accumulatedJson += jsonStr;
                                thinkingContent += jsonStr;
                                thinkingBubble.innerHTML = DOMPurify.sanitize(marked.parse(thinkingContent));
                                if(codeChatMessages) codeChatMessages.scrollTop = codeChatMessages.scrollHeight;
                            }
                        }
                    }
                }
                 if (lines.some(line => line.startsWith('data: ') && line.substring(6).trim() === '[DONE]')) break;
            }
            if (!accumulatedJson.trim()) throw new Error("Fs_Util stream ended with no valid content.");
        } else {
            const result = await fetchLiteLLM(payload, false);
            accumulatedJson = result.choices[0]?.message?.content;
            if (!accumulatedJson) throw new Error("Fs_Util non-streaming response missing content.");
        }

        const fsResult = JSON.parse(accumulatedJson.trim());
        let narrative = `Fs_Util: <code>${fsResult.action}</code>.`;
        switch(fsResult.action) {
            case 'system_log': narrative = `Fs_Util Log: ${Array.isArray(fsResult.fs_content) ? fsResult.fs_content.join('\n') : fsResult.fs_content}`; break;
            case 'update_inode':
                if (fsResult.inode_path && fsResult.fs_content) {
                    const file = vfsFiles.find(f => f.name === fsResult.inode_path);
                    if (file) {
                        file.content = Array.isArray(fsResult.fs_content) ? fsResult.fs_content.join('\n') : fsResult.fs_content;
                        narrative = `Fs_Util updated <code>${fsResult.inode_path}</code> (${file.content.length} bytes).`;
                        if (file.active && codeEditor) codeEditor.value = file.content;
                    } else narrative = `Fs_Util Error: <code>${fsResult.inode_path}</code> not found for update.`;
                } break;
            case 'create_inode':
                if (fsResult.inode_path && fsResult.fs_content) {
                    const newFile: VFSFile = { name: fsResult.inode_path, content: Array.isArray(fsResult.fs_content) ? fsResult.fs_content.join('\n') : fsResult.fs_content, active: false };
                    vfsFiles.push(newFile);
                    narrative = `Fs_Util created <code>${fsResult.inode_path}</code> (${newFile.content.length} bytes).`;
                } break;
            case 'delete_inode':
                if (fsResult.inode_path) {
                    const initialLength = vfsFiles.length;
                    vfsFiles = vfsFiles.filter(f => f.name !== fsResult.inode_path);
                    if (vfsFiles.length < initialLength) {
                        narrative = `Fs_Util deleted <code>${fsResult.inode_path}</code>.`;
                        if (getActiveFile()?.name === fsResult.inode_path) await switchFile('index.html');
                    } else narrative = `Fs_Util Error: <code>${fsResult.inode_path}</code> not found for deletion.`;
                } break;
        }
        thinkingBubble.replaceWith(createChatBubble('assistant', narrative));
        history.push({ role: 'assistant', content: narrative });
        renderFileTree();
    } catch (error: any) {
        console.error("LiteLLM Fs_Util processing error:", error);
        thinkingBubble.remove();
        const errMsg = `Fs_Util Error: ${error.message}. Data: ${accumulatedJson || "N/A"}`;
        codeChatMessages?.appendChild(createChatBubble('error', errMsg));
        history.push({ role: 'assistant', content: `Error: ${errMsg}` });
    }
}

function initializeEventListeners() {
  toggleSidebarButton?.addEventListener('click', () => leftSidebar?.classList.toggle('collapsed'));
  toggleRightSidebarButton?.addEventListener('click', () => rightSidebar?.classList.toggle('collapsed'));
  collapseSidebarButton?.addEventListener('click', () => leftSidebar?.classList.add('collapsed'));
  fileTree?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const fileItem = target.closest<HTMLElement>('.file-item');
    if (fileItem && fileItem.dataset.fileName) {
      updateActiveFileContent(codeEditor?.value || '');
      await switchFile(fileItem.dataset.fileName);
    }
  });
  codeEditor?.addEventListener('input', () => {
   updateActiveFileContent(codeEditor.value);
   saveState();
  });
  tabNav?.addEventListener('click', async (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.matches('.tab-button') && target.dataset.tabId) {
      await switchTab(target.dataset.tabId);
    }
  });
  document.getElementById('tab-content')?.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('#reset-state-button');
    if (!button) return;
    if (button.dataset.confirm === 'true') {
      resetLiaStateToActiveBootstrap();
      saveState();
      renderSystemState(false);
    } else {
      button.dataset.confirm = 'true';
      button.innerHTML = 'Confirm Reset?&nbsp;&nbsp;<span style="font-size: 0.8em;">(one more click)</span>';
      const oBg=button.style.backgroundColor, oCo=button.style.color, oBo=button.style.borderColor;
      button.style.backgroundColor = '#c0392b'; button.style.borderColor = '#b22222'; button.style.color = 'white';
      setTimeout(() => {
        const cb = document.getElementById('reset-state-button') as HTMLButtonElement | null;
        if (cb && cb.dataset.confirm === 'true') {
          cb.dataset.confirm = 'false';
          cb.innerHTML = `Reset Kernel State (init)&nbsp;&nbsp;<span style="font-size: 0.8em;">(double click to confirm)</span>`;
          cb.style.backgroundColor=oBg; cb.style.color=oCo; cb.style.borderColor=oBo;
        }
      }, 3000);
    }
  });
  sendLiaChatButton?.addEventListener('click', () => handleSendMessage(liaChatInput!, liaChatMessages!, sendLiaChatButton!, liaChatHistory, processLiaResponse));
  liaChatInput?.addEventListener('keydown', (e) => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendLiaChatButton?.click(); } });
  sendCodeChatButton?.addEventListener('click', () => handleSendMessage(codeChatInput!, codeChatMessages!, sendCodeChatButton!, codeChatHistory, processCodeAssistantResponse));
  codeChatInput?.addEventListener('keydown', (e) => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendCodeChatButton?.click(); } });

  Object.entries(aiSettingsControls).forEach(([key, element]) => {
    if (element) {
      element.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        let value: string | number = target.value;
        if (target.type === 'range' || target.type === 'number') value = Number(target.value);
        let settingKey = key.replace(/Slider|Input$/, '');
        if (settingKey === 'maxOutputTokens' || settingKey === 'maxTokens') settingKey = 'max_tokens';
        (aiSettings as any)[settingKey] = value;
        if (key.endsWith('Slider')) {
          const inputKey = (settingKey === 'max_tokens' ? 'maxTokensInput' : settingKey + 'Input');
          const input = aiSettingsControls[inputKey as keyof typeof aiSettingsControls];
          if(input) (input as HTMLInputElement).value = String(value);
        } else if (key.endsWith('Input')) {
          const sliderKey = (settingKey === 'max_tokens' ? 'maxTokensSlider' : settingKey + 'Slider');
          const slider = aiSettingsControls[sliderKey as keyof typeof aiSettingsControls];
          if(slider) (slider as HTMLInputElement).value = String(value);
        }
        saveState();
      });
    }
  });
  settingsGroupHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const group = header.dataset.group;
      if (group) {
        const isExpanded = header.classList.toggle('expanded');
        header.nextElementSibling?.classList.toggle('expanded', isExpanded);
        aiSettings.expandedGroups[group] = isExpanded;
        saveState();
      }
    });
  });
  saveProjectButton?.addEventListener('click', () => { saveState(); alert('VFS synced to /dev/localStorage.'); });
  deployKernelButton?.addEventListener('click', () => alert('Deploy: Conceptualized.'));
  downloadArtifactButton?.addEventListener('click', () => alert('Download: Conceptualized.'));
  shareDmesgButton?.addEventListener('click', () => alert('Share: Conceptualized.'));
}

main().catch(console.error);
