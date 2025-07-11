/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, GenerateContentResponse, Type } from "https://esm.run/@google/genai";
import { marked } from "https://esm.run/marked";
import DOMPurify from "https://esm.run/dompurify";

// --- Type Definitions ---
interface VFSFile {
  name: string;
  content: string;
  active: boolean;
}
// LiaState now maps directly to the IDs defined in the new JSON
type LiaState = { [key: string]: number | string };
type LiaMetricDefinition = { id: string, name: string, value_initial: number, range: [number, number], description: string, dynamics_notes?: string, critical_threshold?: number };
type LiaQualitativeDefinition = { id: string, name: string, initial_value: string, description: string };
type LiaBootstrap = {
  SYSTEM_STATE_METRICS: { metrics: LiaMetricDefinition[] };
  SYSTEM_STATE_QUALITATIVE: { states: LiaQualitativeDefinition[] };
  EMBEDDED_SYSTEM_PROMPTS: { protocols: { LIA_Kernel: { prompt_template: string }, Fs_Util: { prompt_template: string } } };
  // Add other sections as needed to be parsed from the bootstrap
};

type ChatMessage = { role: 'user' | 'model'; parts: { text: string }[] };
type AiSettings = {
  model: string;
  temperature: number;
  maxOutputTokens: number;
  topP: number;
  topK: number;
  expandedGroups: { [key: string]: boolean };
  expandedFolders: { [key: string]: boolean };
}

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

// Action Buttons
const saveProjectButton = getElem<HTMLButtonElement>('save-project-button');
const deployKernelButton = getElem<HTMLButtonElement>('deploy-kernel-button');
const downloadArtifactButton = getElem<HTMLButtonElement>('download-artifact-button');
const shareDmesgButton = getElem<HTMLButtonElement>('share-dmesg-button');

const aiSettingsControls = {
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
const settingsGroupHeaders = document.querySelectorAll<HTMLElement>('.settings-group-header');

// --- State Variables ---
let isSwitchingTabs = false; // Guard to prevent rapid tab switching issues
let currentActiveTabId = 'code-editor-tab';
let vfsFiles: VFSFile[] = [];
let liaChatHistory: ChatMessage[] = [];
let codeChatHistory: ChatMessage[] = [];
let aiSettings: AiSettings = {
  model: 'gemini-2.5-flash',
  temperature: 1.0,
  maxOutputTokens: 8192,
  topP: 0.95,
  topK: 40,
  expandedGroups: {},
  expandedFolders: { 'lia_system': true, 'boot': true, 'etc': true, 'lib': true, 'sbin': true, 'usr': true, 'var': true, 'dev': true, 'home': true, 'mnt': true, 'opt': true, 'proc': true, 'root': true, 'sys': true, 'tmp': true } // Initialize based on likely common Linux dirs
};
let liaState: LiaState = {};
let ai: GoogleGenAI;
let apiKey: string;

// Update this to the new JSON file name
const LIA_BOOTSTRAP_FILENAME = 'LIA_MASTER_BOOTSTRAP_v7.2_Enhanced.json'; // Relative to public/
const ALL_JSON_FILES_TO_LOAD = [
    'LIA_MASTER_BOOTSTRAP_v7.1_Absolute_Kernel_Root_Edition_Refined.json',
    'LIA_MASTER_BOOTSTRAP_v7.2_Enhanced.json',
    'LIA_UTILITIES_MODULE_v1.0_Systemd_Extensions.json'
];
// These are now conceptual folder names. Update based on `VIRTUAL_FILESYSTEM_HIERARCHY`
// For simplicity, we'll prefix them for the VFS but the JSON shows them as standard Linux paths.
// The `createFileElement` will handle displaying only the file name inside the conceptual folder.
const CONCEPTUAL_FOLDER_PREFIXES = ['lia_system', 'bin', 'sbin', 'etc', 'dev', 'proc', 'sys', 'lib', 'boot', 'usr', 'var', 'mnt', 'opt', 'tmp', 'home', 'root'];


// Initial HTML/CSS/JS files for the editor
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
  // The actual JSON content for the new bootstrap goes here.
  // We explicitly load it from the build artifact or provide a dummy initially.
  // In a real scenario, this would be fetched or embedded by the build process.
  // For now, let's keep it empty as it's sourced from the pre-provided file.
  // { name: LIA_BOOTSTRAP_FILENAME, content: `{}`, active: false }, // Removed old single bootstrap placeholder
];

// --- Marked Customization for Code Blocks ---
marked.use({
  highlight: (code: string, lang: string) => {
    // This is a placeholder for a real syntax highlighter if needed in the future.
    // For now, it just wraps code in standard pre/code tags.
    const language = lang || 'plaintext';
    return `<pre><code class="language-${language}">${code}</code></pre>`;
  },
});


// --- Initialization ---
async function main() {
  if (!process.env.API_KEY) {
    document.body.innerHTML = '<h1>Missing API Key</h1><p>Please set the API_KEY environment variable.</p>';
    return;
  }
  apiKey = process.env.API_KEY;
  ai = new GoogleGenAI({ apiKey });

  await loadState(); // Load historical state and AI settings
  await loadAllJsonFilesIntoVFS(); // Load all JSONs from public/
  initializeEventListeners();
  renderFileTree(); // Render tree after all files are loaded

  // Handle initial LIA state (bootstrap or saved)
  // This ensures the LIA state variables are correctly initialized from the LIA_BOOTSTRAP_FILENAME content.
  // resetLiaState is called within loadAllJsonFilesIntoVFS after the primary bootstrap is loaded.
  if (Object.keys(liaState).length === 0 || !liaState.KCS) {
    // This check might be redundant if resetLiaState is reliably called after bootstrap load
    console.warn("LIA state was not initialized by loadAllJsonFilesIntoVFS, attempting reset.");
    resetLiaState();
  }

  await switchFile(getActiveFile()?.name || 'index.html');
  // Initial render of tabs will be handled by switchFile -> switchTab
}

async function loadAllJsonFilesIntoVFS() {
  for (const jsonFileName of ALL_JSON_FILES_TO_LOAD) {
    // Construct the path assuming files are directly in 'public/' and fetch needs a path relative to the HTML file.
    const filePath = `./${jsonFileName}`;
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${jsonFileName}`);
      }
      const fileContent = await response.text();
      let vfsEntry = vfsFiles.find(f => f.name === jsonFileName);
      if (vfsEntry) {
        vfsEntry.content = fileContent;
      } else {
        // Add the file to VFS. These are conceptual paths, so just the filename is fine for `name`.
        vfsFiles.push({ name: jsonFileName, content: fileContent, active: false });
      }
      console.log(`Successfully loaded ${jsonFileName} into VFS.`);

      // If this is the primary bootstrap file, reset LIA state immediately after loading it,
      // but only if liaState hasn't been populated from localStorage already.
      if (jsonFileName === LIA_BOOTSTRAP_FILENAME) {
        const savedLiaState = localStorage.getItem('lia_liaState');
        if (!savedLiaState || Object.keys(JSON.parse(savedLiaState)).length === 0) {
            console.log(`Primary bootstrap ${LIA_BOOTSTRAP_FILENAME} loaded and no saved state. Resetting LIA state.`);
            resetLiaState();
        } else {
            console.log(`Primary bootstrap ${LIA_BOOTSTRAP_FILENAME} loaded, but using existing LIA state from localStorage.`);
        }
      }
    } catch (err) {
      console.error(`Failed to fetch or update VFS for ${jsonFileName}:`, err);
      if (!vfsFiles.some(f => f.name === jsonFileName)) {
        vfsFiles.push({ name: jsonFileName, content: `{"error": "Failed to load ${jsonFileName}"}`, active: false });
      }
    }
  }
  // It's better to render the file tree once after all files are processed.
  // renderFileTree(); // This will be called in main() after this function completes.
}

async function loadState() {
  const savedVfs = localStorage.getItem('lia_vfs');
  const savedLiaState = localStorage.getItem('lia_liaState');
  const savedLiaChat = localStorage.getItem('lia_liaChatHistory');
  const savedCodeChat = localStorage.getItem('lia_codeChatHistory');
  const savedSettings = localStorage.getItem('lia_aiSettings');

  if (savedVfs) {
    const savedFiles: VFSFile[] = JSON.parse(savedVfs);
    const defaultFilesMap = new Map(defaultVfsFiles.map(f => [f.name, f]));
    const savedFilesMap = new Map(savedFiles.map(f => [f.name, f]));

    // Start with default files, update with saved content if available
    let currentFiles = defaultVfsFiles.map(defaultFile => {
        return savedFilesMap.get(defaultFile.name) || defaultFile;
    });

    // Add any files from localStorage that are not in defaults (e.g., user-created through Fs_Util if that were a feature)
    // or previously loaded JSONs that aren't in the current defaultVfsFiles list.
    savedFiles.forEach(savedFile => {
        if (!currentFiles.some(f => f.name === savedFile.name)) {
            currentFiles.push(savedFile);
        }
    });
    vfsFiles = currentFiles;

  } else {
    vfsFiles = [...defaultVfsFiles];
  }

  // Ensure all JSONs to load are represented in vfsFiles, even if just with empty content initially.
  // Their actual content will be fetched by loadAllJsonFilesIntoVFS.
  ALL_JSON_FILES_TO_LOAD.forEach(jsonFileName => {
    if (!vfsFiles.some(f => f.name === jsonFileName)) {
      vfsFiles.push({ name: jsonFileName, content: '{}', active: false });
    }
  });

  // liaState will be re-initialized from bootstrap content after it's fetched by loadAllJsonFilesIntoVFS
  liaState = savedLiaState ? JSON.parse(savedLiaState) : {};

  liaChatHistory = savedLiaChat ? JSON.parse(savedLiaChat) : [];
  codeChatHistory = savedCodeChat ? JSON.parse(savedCodeChat) : [];

  if (savedSettings) {
    aiSettings = { ...aiSettings, ...JSON.parse(savedSettings) };
  }

  // Apply loaded settings to UI
  if (aiSettingsControls.model) aiSettingsControls.model.value = aiSettings.model;
  if (aiSettingsControls.temperatureSlider) aiSettingsControls.temperatureSlider.value = String(aiSettings.temperature);
  if (aiSettingsControls.temperatureInput) aiSettingsControls.temperatureInput.value = String(aiSettings.temperature);
  if (aiSettingsControls.maxTokensSlider) aiSettingsControls.maxTokensSlider.value = String(aiSettings.maxOutputTokens);
  if (aiSettingsControls.maxTokensInput) aiSettingsControls.maxTokensInput.value = String(aiSettings.maxOutputTokens);
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
}

function resetLiaState() {
  try {
    const bootstrapFile = getFileContent(LIA_BOOTSTRAP_FILENAME);
    if (!bootstrapFile) throw new Error("Bootstrap file not found or empty.");
    // Cast to LiaBootstrap to ensure type safety based on our JSON structure
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFile);
    const newLiaState: LiaState = {};

    const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
    const qualitativeStates = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];

    metrics.forEach(metric => {
      newLiaState[metric.id] = metric.value_initial;
    });
    qualitativeStates.forEach(state => {
      newLiaState[state.id] = state.initial_value;
    });

    liaState = newLiaState;
  } catch (e: any) {
    console.error("Failed to reset LIA state:", e.message, e.stack);
    liaState = { KCS: 0.0, PSS: 0.0, ERROR: 1, MESSAGE: e.message }; // Fallback error state
  }
}


// --- VFS Functions ---
const getFileContent = (name: string) => vfsFiles.find(f => f.name === name)?.content;
const getActiveFile = () => vfsFiles.find(f => f.active);

async function switchFile(name: string) {
  vfsFiles.forEach(f => f.active = (f.name === name));
  const newActiveFile = getActiveFile();
  if (codeEditor && newActiveFile) {
    codeEditor.value = newActiveFile.content;
  }
  renderFileTree();
  // We always switch to 'code-editor-tab' when selecting a file
  await switchTab('code-editor-tab');
}

function updateActiveFileContent(newContent: string) {
  const activeFile = getActiveFile();
  if (activeFile) {
    activeFile.content = newContent;
  }
}

// --- UI Rendering ---
function renderFileTree() {
  if (!fileTree) return;
  fileTree.innerHTML = '';

  // Separate files into conceptual folders
  const folders: { [key: string]: VFSFile[] } = {};
  const rootFiles: VFSFile[] = [];

  vfsFiles.forEach(file => {
      let foundFolder = false;
      for (const prefix of CONCEPTUAL_FOLDER_PREFIXES) {
          if (file.name.startsWith(prefix + '/') || file.name === prefix) { // Handle root-level files named as folders conceptually
              if (!folders[prefix]) {
                  folders[prefix] = [];
              }
              folders[prefix].push(file);
              foundFolder = true;
              break;
          }
      }
      if (!foundFolder) {
          rootFiles.push(file);
      }
  });

  // Render root files
  rootFiles.forEach(file => fileTree.appendChild(createFileElement(file)));

  // Render folders and their contents
  for (const folderName of Object.keys(folders).sort()) { // Sort folders alphabetically
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
  // Display only the file name, not the full path in the VFS tree
  el.textContent = file.name.split('/').pop() || file.name;
  el.dataset.fileName = file.name; // Store full path in data attribute
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
  } catch(e) {
    console.error(`Failed to switch to tab ${tabId}:`, e);
  }
  finally {
    isSwitchingTabs = false;
  }
}

function renderActiveTabContent() {
  switch(currentActiveTabId) {
    case 'system-state-tab':
      renderSystemState(false);
      break;
    case 'ai-assistant-tab':
        // Ensure chat history is displayed when switching to AI tab
        renderChatHistory(liaChatMessages!, liaChatHistory);
        break;
    case 'code-assistant-tab':
        // Ensure code chat history is displayed when switching to Code Assistant tab
        renderChatHistory(codeChatMessages!, codeChatHistory);
        break;
  }
}

function renderSystemState(wasUpdated = false) {
  if (!systemStatePane) return;
  try {
    const bootstrapFile = getFileContent(LIA_BOOTSTRAP_FILENAME);
    if (!bootstrapFile) {
      systemStatePane.innerHTML = `<p>ALERT: ${LIA_BOOTSTRAP_FILENAME} Not Found - Kernel State Undetermined.</p>`;
      return;
    }
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFile);
    const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
    const qualitativeStates = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];

    const metricsHTML = metrics.map((metric: LiaMetricDefinition) => {
      const value = liaState[metric.id] ?? metric.value_initial;
      const range = metric.range || [0.0, 1.0];
      const normalizedValue = typeof value === 'number' ? value : metric.value_initial; // Fallback for type safety
      const percentage = Math.max(0, Math.min(100, ((normalizedValue - range[0]) / (range[1] - range[0])) * 100));
      return `
        <div class="metric-item">
          <div class="metric-header">
            <span class="metric-label">${metric.name} (${metric.id.toUpperCase()})</span>
            <span class="metric-value">${typeof value === 'number' ? value.toFixed(3) : value}</span>
          </div>
          <div class="metric-bar-container">
            <div class="metric-bar" style="width: ${percentage}%;"></div>
          </div>
          <p class="metric-description">${metric.description || ''}</p>
        </div>
      `;
    }).join('');

    const qualitativeHTML = qualitativeStates.map((state: LiaQualitativeDefinition) => {
      const value = liaState[state.id] ?? state.initial_value;
      return `
        <div class="qualitative-item">
          <span class="qualitative-label">${state.name}</span>
          <span class="qualitative-value">${value}</span>
        </div>
      `;
    }).join('');


    systemStatePane.innerHTML = `
      <div class="system-state-header">
        <button id="reset-state-button" class="toolbar-button" title="Reset all state to initial values">`
          + `Reset Kernel State (init)&nbsp;&nbsp;<span style="font-size: 0.8em;">(double click to confirm)</span>` + // Added visual cue for double click
        `</button>
      </div>
      <h2 class="state-section-header">Quantitative Kernel Metrics</h2>
      <div class="metric-grid" ${wasUpdated ? 'data-flash="true"' : ''}>${metricsHTML}</div>
      <h2 class="state-section-header">Qualitative Kernel States</h2>
      <div class="qualitative-grid">${qualitativeHTML}</div>
    `;

    // Use a data attribute for the flash effect to avoid re-rendering issues
    const grid = systemStatePane.querySelector('[data-flash="true"]');
    if (grid) {
      grid.classList.add('flash');
      setTimeout(() => {
        grid.classList.remove('flash');
        grid.removeAttribute('data-flash');
      }, 500);
    }

  } catch (e: any) {
    systemStatePane.innerHTML = `<p>WARNING: Error rendering kernel state: ${e.message}</p><pre>${e.stack}</pre>`;
    console.error(e);
  }
}


// --- AI & Chat ---
function createChatBubble(role: 'user' | 'model' | 'error', text: string, thinking = false): HTMLElement {
  const bubble = document.createElement('div');
  bubble.classList.add('chat-bubble', role === 'model' ? 'ai' : 'user');
  if (role === 'error') {
    bubble.classList.add('ai', 'error');
    bubble.textContent = `KERNEL MESSAGE (ERROR): ${text}`; // Linux-themed error
  } else if (thinking) {
    bubble.classList.add('thinking');
    bubble.textContent = 'Kernel is processing...';
  } else {
    bubble.innerHTML = DOMPurify.sanitize(marked.parse(text));
  }
  return bubble;
}

function renderChatHistory(messagesEl: HTMLElement, history: ChatMessage[]) {
    messagesEl.innerHTML = '';
    history.forEach(msg => messagesEl.appendChild(createChatBubble(msg.role, msg.parts[0].text)));
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function handleSendMessage(
  inputEl: HTMLTextAreaElement,
  messagesEl: HTMLElement,
  buttonEl: HTMLButtonElement,
  chatHistory: ChatMessage[],
  aiProcessor: (history: ChatMessage[], thinkingBubble: HTMLElement) => Promise<void>
) {
  if (!inputEl.value.trim()) return;

  const userInput = inputEl.value.trim();
  inputEl.value = '';
  inputEl.style.height = 'auto'; // Reset height
  inputEl.disabled = true;
  buttonEl.disabled = true;

  chatHistory.push({ role: 'user', parts: [{ text: userInput }] });
  renderChatHistory(messagesEl, chatHistory);

  const thinkingBubble = createChatBubble('model', '', true); // Thinking bubble
  messagesEl.appendChild(thinkingBubble);
  messagesEl.scrollTop = messagesEl.scrollHeight;


  try {
    await aiProcessor(chatHistory, thinkingBubble);
  } catch (e: any) {
    console.error("AI processing failed", e);
    thinkingBubble.remove(); // Remove thinking bubble
    messagesEl.appendChild(createChatBubble('error', e.message || 'An unknown kernel panic occurred.'));
  } finally {
    inputEl.disabled = false;
    buttonEl.disabled = false;
    inputEl.focus();
    messagesEl.scrollTop = messagesEl.scrollHeight;
    saveState();
  }
}

async function processLiaResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
  const bootstrapFile = getFileContent(LIA_BOOTSTRAP_FILENAME);
  if (!bootstrapFile) throw new Error("LIA Bootstrap file not found for processing.");
  const bootstrap: LiaBootstrap = JSON.parse(bootstrapFile);
  let systemPromptTemplate = bootstrap.EMBEDDED_SYSTEM_PROMPTS.protocols.LIA_Kernel.prompt_template;

  const userPrompt = history.length > 0 ? history[history.length - 1].parts[0].text : "";
  const operator = userPrompt.split(' ')[0] || 'init'; // Simple parsing for operator

  // Dynamically build the state string from all defined states in the bootstrap file
  const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
  const qualitativeStates = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];
  const allStates = [...metrics, ...qualitativeStates];
  const stateString = allStates.map(s => {
      const value = liaState[s.id];
      const displayValue = typeof value === 'number' ? value.toFixed(3) : value; // Use fixed 3 decimal places for numbers
      return `${s.id.toUpperCase()}: ${displayValue}`;
  }).join(', ');

  let systemPrompt = systemPromptTemplate.replace('%%STATE_STRING%%', stateString);
  systemPrompt = systemPrompt.replace('%%OPERATOR%%', operator);
  systemPrompt = systemPrompt.replace('%%USER_PROMPT%%', userPrompt);

  // Dynamically build the response schema based on current metrics/states
  const newStateProperties: { [key: string]: { type: Type } } = {};
  metrics.forEach((m: LiaMetricDefinition) => {
      newStateProperties[m.id] = { type: Type.NUMBER };
  });
  qualitativeStates.forEach((s: LiaQualitativeDefinition) => {
      newStateProperties[s.id] = { type: Type.STRING };
  });

  const schema = {
      type: Type.OBJECT,
      properties: {
          kernel_log: { type: Type.STRING },
          new_kernel_state: {
              type: Type.OBJECT,
              properties: newStateProperties,
              required: allStates.map(s => s.id) // All state IDs are required in the response
          },
      },
      required: ['kernel_log', 'new_kernel_state'],
  };

  const model = ai.getGenerativeModel({
      model: aiSettings.model,
      generationConfig: {
          temperature: aiSettings.temperature,
          maxOutputTokens: aiSettings.maxOutputTokens,
          topP: aiSettings.topP,
          topK: aiSettings.topK,
          responseMimeType: "application/json",
          responseSchema: schema,
      }
  });

  const chat = model.startChat({
      history: history.slice(0, -1) // Exclude the last user prompt as it's part of context
  });

  const responseStream = await chat.sendMessageStream({
      text: userPrompt,
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] }
  });

  let fullResponseText = '';
  for await (const chunk of responseStream) {
      if (chunk.text) {
          fullResponseText += chunk.text;
      }
  }

  const result = JSON.parse(fullResponseText.trim());

  if (result.kernel_log && result.new_kernel_state) {
      // Merge new state values into the global liaState
      for (const key in result.new_kernel_state) {
          if (result.new_kernel_state.hasOwnProperty(key)) {
              // Ensure numerical types are parsed correctly
              if (typeof liaState[key] === 'number' && typeof result.new_kernel_state[key] === 'string') {
                  liaState[key] = parseFloat(result.new_kernel_state[key]);
              } else {
                  liaState[key] = result.new_kernel_state[key];
              }
          }
      }
      history.pop(); // Remove the "thinking" placeholder
      history.push({ role: 'model', parts: [{ text: result.kernel_log }] });
      thinkingBubble.replaceWith(createChatBubble('model', result.kernel_log));
      if (currentActiveTabId === 'system-state-tab') {
          renderSystemState(true);
      }
  } else {
      throw new Error("Invalid JSON response from LIA Kernel: Missing 'kernel_log' or 'new_kernel_state'.");
  }
}

async function processCodeAssistantResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    const bootstrapFile = getFileContent(LIA_BOOTSTRAP_FILENAME);
    if (!bootstrapFile) throw new Error("LIA Bootstrap file not found for Fs_Util processing.");
    const bootstrap: LiaBootstrap = JSON.parse(bootstrapFile);
    let systemPromptTemplate = bootstrap.EMBEDDED_SYSTEM_PROMPTS.protocols.Fs_Util.prompt_template;

    const userPrompt = history.length > 0 ? history[history.length - 1].parts[0].text : "";
    
    // Convert vfsFiles to a manifest string if needed by the Fs_Util prompt
    const fileManifest = vfsFiles.map(f => `${f.name} (${f.content.length} bytes)`).join('\n');

    let systemInstruction = systemPromptTemplate.replace('%%PROMPT%%', userPrompt);
    systemInstruction = systemInstruction.replace('%%FILE_MANIFEST%%', fileManifest);

    // Fs_Util expects a specific JSON structure for its actions
    const schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ['system_log', 'update_inode', 'create_inode', 'delete_inode'] }, // Added delete_inode
            inode_path: { type: Type.STRING, nullable: true }, // Path of the file/inode
            fs_content: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true } // Content for update/create
        },
        required: ['action']
    };

    const model = ai.getGenerativeModel({
        model: aiSettings.model,
        generationConfig: {
            temperature: aiSettings.temperature,
            maxOutputTokens: aiSettings.maxOutputTokens,
            topP: aiSettings.topP,
            topK: aiSettings.topK,
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    try {
        const response = await model.generateContent({
            contents: history.slice(-1), // Send only the last user message for direct response
            systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        let narrative = `Fs_Util executed action: <code>${result.action}</code>.`;

        switch(result.action) {
            case 'system_log':
                narrative = `Fs_Util Report: ${result.fs_content}`;
                break;
            case 'update_inode':
                if (result.inode_path && result.fs_content) {
                    const file = vfsFiles.find(f => f.name === result.inode_path);
                    if (file) {
                        file.content = result.fs_content.join('\n');
                        narrative = `Fs_Util updated inode <code>${result.inode_path}</code>. Size: ${file.content.length} bytes.`;
                        if (file.active && codeEditor) codeEditor.value = file.content; // Update editor if active file changed
                    } else {
                        narrative = `Fs_Util Error: Inode <code>${result.inode_path}</code> not found for update.`;
                    }
                }
                break;
            case 'create_inode':
                if (result.inode_path && result.fs_content) {
                    const newFile: VFSFile = { name: result.inode_path, content: result.fs_content.join('\n'), active: false };
                    vfsFiles.push(newFile);
                    narrative = `Fs_Util created new inode <code>${result.inode_path}</code>. Size: ${newFile.content.length} bytes.`;
                }
                break;
            case 'delete_inode': // Added delete action
                if (result.inode_path) {
                    const initialLength = vfsFiles.length;
                    vfsFiles = vfsFiles.filter(f => f.name !== result.inode_path);
                    if (vfsFiles.length < initialLength) {
                        narrative = `Fs_Util deleted inode <code>${result.inode_path}</code>.`;
                        if (getActiveFile()?.name === result.inode_path) { // If active file was deleted
                            await switchFile('index.html'); // Switch to a default file
                        } else {
                            renderFileTree(); // Just re-render tree if not active file
                        }
                    } else {
                        narrative = `Fs_Util Error: Inode <code>${result.inode_path}</code> not found for deletion.`;
                    }
                }
                break;
            default:
                narrative = `Fs_Util reports: Unknown action <code>${result.action}</code>.`;
        }
        
        thinkingBubble.replaceWith(createChatBubble('model', narrative));
        codeChatHistory.push({ role: 'model', parts: [{ text: narrative }] });
        renderFileTree(); // Re-render file tree after FS changes
    } catch (error: any) {
        throw new Error(`Fs_Util processing error: ${error.message}. Received: ${error.response?.text || 'N/A'}`);
    }
}


// --- Event Listeners ---
function initializeEventListeners() {
  // Sidebars
  toggleSidebarButton?.addEventListener('click', () => leftSidebar?.classList.toggle('collapsed'));
  toggleRightSidebarButton?.addEventListener('click', () => rightSidebar?.classList.toggle('collapsed'));
  collapseSidebarButton?.addEventListener('click', () => leftSidebar?.classList.add('collapsed'));

  // File Tree
  fileTree?.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    const fileItem = target.closest<HTMLElement>('.file-item');
    if (fileItem && fileItem.dataset.fileName) {
      updateActiveFileContent(codeEditor?.value || '');
      await switchFile(fileItem.dataset.fileName);
    }
  });

  // Code Editor
  codeEditor?.addEventListener('input', () => {
   updateActiveFileContent(codeEditor.value);
   saveState();
  });

  // Tab Navigation
  tabNav?.addEventListener('click', async (e) => {
    const target = e.target as HTMLButtonElement;
    if (target.matches('.tab-button') && target.dataset.tabId) {
      await switchTab(target.dataset.tabId);
    }
  });

  // System State Reset Button (Event Delegation with 2-click confirm)
  document.getElementById('tab-content')?.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('#reset-state-button');
    if (!button) return;

    if (button.dataset.confirm === 'true') {
      resetLiaState();
      saveState();
      renderSystemState(false);
    } else {
      button.dataset.confirm = 'true';
      button.innerHTML = 'Confirm Reset?&nbsp;&nbsp;<span style="font-size: 0.8em;">(one more click)</span>'; // Updated text for confirmation
      const originalBg = button.style.backgroundColor;
      const originalColor = button.style.color;
      const originalBorder = button.style.borderColor;

      button.style.backgroundColor = '#c0392b';
      button.style.borderColor = '#b22222';
      button.style.color = 'white';

      setTimeout(() => {
        const currentButton = document.getElementById('reset-state-button') as HTMLButtonElement | null;
        if (currentButton && currentButton.dataset.confirm === 'true') {
          currentButton.dataset.confirm = 'false';
          currentButton.innerHTML = `Reset Kernel State (init)&nbsp;&nbsp;<span style="font-size: 0.8em;">(double click to confirm)</span>`;
          currentButton.style.backgroundColor = originalBg;
          currentButton.style.color = originalColor;
          currentButton.style.borderColor = originalBorder;
        }
      }, 3000);
    }
  });


  // Chat
  sendLiaChatButton?.addEventListener('click', () => handleSendMessage(liaChatInput!, liaChatMessages!, sendLiaChatButton!, liaChatHistory, processLiaResponse));
  liaChatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendLiaChatButton?.click();
    }
  });
  sendCodeChatButton?.addEventListener('click', () => handleSendMessage(codeChatInput!, codeChatMessages!, sendCodeChatButton!, codeChatHistory, processCodeAssistantResponse));
  codeChatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCodeChatButton?.click();
    }
  });


  // AI Settings
  Object.entries(aiSettingsControls).forEach(([key, element]) => {
    if (element) {
      element.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        const value = target.type === 'range' || target.type === 'number' ? Number(target.value) : target.value;
        const settingKey = key.replace(/Slider|Input$/, '');
        (aiSettings as any)[settingKey] = value;

        // Sync slider and input fields
        if (key.endsWith('Slider')) {
          const input = aiSettingsControls[(settingKey + 'Input') as keyof typeof aiSettingsControls];
          if(input) (input as HTMLInputElement).value = String(value);
        } else if (key.endsWith('Input')) {
          const slider = aiSettingsControls[(settingKey + 'Slider') as keyof typeof aiSettingsControls];
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

  // Action button placeholders to integrate with Linux concepts
  saveProjectButton?.addEventListener('click', () => {
      saveState();
      alert('Kernel state and VFS inodes forcefully synced to persistent storage (/dev/localStorage).');
  });
  deployKernelButton?.addEventListener('click', () => {
      alert('Deploy Kernel Module: Conceptualized as `modprobe` followed by `systemctl enable/start`. (Not implemented physically in this demo).');
  });
  downloadArtifactButton?.addEventListener('click', () => {
      alert('Download Boot Artifact: Initiates `dd if=/dev/ramfs of=boot_image.tar.gz`. (Download functionality not implemented in this demo).');
  });
  shareDmesgButton?.addEventListener('click', () => {
      alert('Share Dmesg Log: `klogd` broadcasting current `kernel_log_level`. (Share functionality not implemented in this demo).');
  });
}

// --- Run Application ---
main().catch(console.error);

