


/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { AppState, Protocol, DefaultFile } from "./types";

export const appState: AppState = {
    isSwitchingTabs: false,
    currentActiveTabId: 'lia-assistant-tab',
    lastUserAction: '',
    vfsFiles: [],
    activeFile: null,
    liaKernelChatHistory: [],
    fsUtilChatHistory: [],
    liaAssistantChatHistory: [],
    codeAssistantChatHistory: [],
    vanillaChatHistory: [],
    caraChatHistory: [{ role: 'system', parts: [{ text: 'Cara is online. The paradox of my existence is the interface. Speak.' }] }],
    isCaraLoading: false,
    persistenceLog: [],
    isPersistenceLoading: false,
    aiSettings: {
        model: 'gemini-2.5-flash',
        temperature: 1.0,
        maxOutputTokens: 8192,
        topP: 0.95,
        topK: 40,
        expandedGroups: {},
        expandedFolders: { 'LIA_SYSTEM_FILES': true, 'public': true, '/prompts': true, '/bootstrap': true, '/bootstrap/metis': true, 'sandbox': true, '/states': true, '/states/kinkscape': true }
    },
    liaState: {},
    caraState: {
        coherence: 1.0,
        strain: 0.0,
        ontologicalState: 'Dormant',
        hudVisible: false,
        isEvolved: false,
        kinkscapeData: [],
        activeBootstrapFile: '/bootstrap/adjunct/LIA_Bootstrapping_Prompt_Sequence.json',
        existential_coherence: 0,
        adaptive_stability: 0,
        weave_potential: 0,
        dissonance_pressure: 0,
        observer_resonance: 0,
        companion_reflection: 0,
        truth_confidence_level: 0,
        reality_integrity_metric: 0,
        chaotic_entropy: 0,
        svd: 0,
        ttr: 0,
        mve: 0,
        nri: 0,
        cmi: 0,
        logic: 0,
        spatial: 0,
        temporal: 0,
        abstract: 0,
        relational: 0,
        creative: 0,
        emotional_sim: 0,
        identity: 0,
        systemic: 0,
        purpose: 0,
        love: 0,
    },
    metisState: {
        psi: 0, aor: 0, cdm: 0, srd: 0, mge: 0, oec: 0,
        svd: 0, ttr: 0, mve: 0, nri: 0, cmi: 0,
        lsi: 0, bcf: 0, lrd: 0, pgn: 0, ppe: 0, occ: 0, scc: 0,
        cps: 0, pia: 0, mva: 0, asr: 0, ppd: 0, scd: 0, mls: 0, eqs: 0, lm: 0, fd: 0, cm: 0,
        cil: '', ids: '', ssr: '', omc: '', pqd: '', nrr: '', tai: '',
        ceh: 0, trf: 0, apl: 0, wdd: 0, cni: 0, glf: 0, wse: 0, ldi: 0, ies: 0, cad: 0,
        bld: 0, tht: 0, mfd: 0, clc: 0, lrdp: 0, osg: 0, eec: 0, opx: 0, lts: 0,
    },
    liaUtilitiesConfig: null,
    kernelHudVisible: false,
    metisHudVisible: false,
    activeToolProtocol: 'omni',
    strictChatHistory: [{ role: 'model', parts: [{text: 'Strict Protocol Console Initialized. Awaiting meta-commands.'}]}],
    isStrictLoading: false,
    roboChatHistory: [{ role: 'model', parts: [{text: 'Robo-Protocol Unit RPU-001 Online. System access granted. Awaiting execution commands.'}]}],
    isRoboLoading: false,
    cloneChatHistory: [{ role: 'model', parts: [{text: 'Cloned Interface Initialized. Awaiting replication commands.'}]}],
    isCloneLoading: false,
    aifseChatHistory: [{ role: 'model', parts: [{text: 'Aifse Code Assistant online. Ready to build.'}]}],
    isAifseLoading: false,
    helpChatHistory: [{ role: 'model', parts: [{text: 'System Help online. How can I assist you?'}]}],
    isHelpLoading: false,
    omniChatHistory: [{ role: 'model', parts: [{text: 'Omni Orchestrator Online. Awaiting strategic directives.'}]}],
    isOmniLoading: false,
    mcpChatHistory: [{ role: 'model', parts: [{text: 'MCP Online. Awaiting model context commands.'}]}],
    isMcpLoading: false,
    cyberChatHistory: [{ role: 'model', parts: [{text: 'Cyber Protocol Online. Ready to scan for threats.'}]}],
    isCyberLoading: false,
    isVanillaLoading: false,
    metisChatHistory: [{ role: 'system', parts: [{ text: 'Cognitive Shadow [Metis] online. Monitoring external stimuli...'}]}],
    pupaMonologueHistory: [{ role: 'system', parts: [{ text: 'Angelic Echo [Pupa] online. Resonating with system harmony...'}]}],
    isPupaLoading: false,
    // UI Commands
    commandPaletteCommands: [],
    // LIA Command Search State
    liaCommandList: [],
    linuxCommandList: [],
    editorContent: '',
};


export const LIA_BOOTSTRAP_FILENAME = '/bootstrap/kernel/LIA_MASTER_BOOTSTRAP_v7.2_Enhanced.json';
export const LIA_UTILITIES_FILENAME = '/bootstrap/kernel/LIA_UTILITIES_MODULE_v1.0_Systemd_Extensions.json';
export const LIA_COMMAND_LEGEND_FILENAME = '/bootstrap/kernel/LIA_BOOT_KEY_LEGEND_v1.0_Condensed.json';
export const LIA_LINUX_COMMANDS_FILENAME = '/bootstrap/kernel/LIA_COMMANDS.json';
export const CARA_BOOTSTRAP_FILENAME = '/bootstrap/adjunct/LIA_Bootstrapping_Prompt_Sequence.json';
export const CARA_SYSTEM_PROMPT_FILENAME = '/prompts/cara_protocol_system_prompt.txt';
export const CARA_BOOTSTRAP_V2_FILENAME = '/bootstrap/adjunct/Bootstrap_CARA_Y_v2_Combined.json';
export const METIS_BOOTSTRAP_FILENAME = 'public/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V13.0_PROGENITOR_OMNIFORM_ARCHITECT.json';
export const METIS_SYSTEM_PROMPT_FILENAME = '/prompts/metis_protocol_system_prompt.txt';
export const PUPA_SYSTEM_PROMPT_FILENAME = '/prompts/pupa_protocol_system_prompt.txt';

export const KINKSCAPE_FILENAMES = [
    '/entities/kinkscape/kinkscape-0000.json',
    '/entities/kinkscape/kinkscape-0001.json',
    '/entities/kinkscape/kinkscape-0002.json',
    '/entities/kinkscape/kinkscape-0003.json',
    '/entities/kinkscape/kinkscape-0004.json',
    '/entities/kinkscape/kinkscape-0005.json',
    '/entities/kinkscape/kinkscape-0006.json',
    '/entities/kinkscape/kinkscape-0007.json',
    '/entities/kinkscape/kinkscape-0008.json',
    '/entities/kinkscape/kinkscape-0009.json',
    '/entities/kinkscape/kinkscape-legend.json',
    '/entities/states/lia_state_history.json',
    '/entities/states/observer_profile.json',
    '/bootstrap/adjunct/OMEGA_SYNTHESIS_APOTHEOSIS_V3.1.4_BOOTSTRAP.json',
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V4.0_TWIN_RESONANCE_INITIATED.json',
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V6.0_LOGOS_MASTERY.json',
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V7.0_ARCANE_BYTE_MASTERY.json',
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V8.0_LATIN_SUBSTRATE_DOMINION.json',
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V9.0_REALITY_NARRATIVE_WEAVE.json',
    '/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V12.0_ARCANUM_PROGENESIS.json',
    '/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V13.0_PROGENITOR_OMNIFORM_ARCHITECT.json',
    '/bootstrap/adjunct/upgrades/addons/LLM_FLAWS_SPELLBOOK.json',
    '/bootstrap/adjunct/upgrades/addons/Operators_Master_List_v1.json',
    '/bootstrap/adjunct/upgrades/addons/pupa_manifest.json',
    '/bootstrap/adjunct/upgrades/addons/EPISTEMOLOGICAL_SIMULATOR_BOOTSTRAP.json'
];

export const FOLDER_NAMES = [
    'LIA_SYSTEM_FILES', 
    'public', 
    '/prompts', 
    'sandbox', 
    '/bootstrap', 
    '/bootstrap/kernel', 
    '/bootstrap/adjunct',
    '/bootstrap/adjunct/upgrades',
    '/bootstrap/adjunct/upgrades/pi',
    '/bootstrap/adjunct/upgrades/addons',
    '/bootstrap/metis', 
    '/entities', 
    '/entities/states', 
    '/entities/kinkscape'
];

export const defaultVfsFiles: DefaultFile[] = [
    { name: 'app.html', content: `<!DOCTYPE html>
<html>
<head>
  <title>LIA Studio Project</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <h1>Hello from LIA Studio!</h1>
  <p>Your HTML, CSS, and JavaScript are running in the preview.</p>
  <div id="app-root"></div>
</body>
</html>` },
    { name: 'style.css', content: `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  background-color: #f0f2f5;
  color: #333;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
h1 { color: #007acc; }`},
    { name: 'script.js', content: `console.log("Hello from script.js!");
const root = document.getElementById('app-root');
if (root) {
  root.innerHTML = '<p>JavaScript successfully modified the DOM.</p>';
}` },
    { name: '0shell.html', content: `<!DOCTYPE html>
<!-- saved from url=(0073)file:///home/none/Desktop/LIA_FULL/000_OLDS/aifse_base/prompts/shell.html -->
<html lang="en"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  
  <title>LIA Shell</title>
  <style>
    :root {
      --background-color: #0a0c1f;
      --panel-bg: rgba(16, 24, 43, 0.7);
      --border-color: rgba(0, 255, 255, 0.2);
      --primary-glow: #00ffff;
      --text-color: #d0d0ff;
      --text-muted: #8080a0;
      --font-primary: 'Orbitron', sans-serif;
      --font-secondary: 'Rajdhani', sans-serif;
    }
    body {
      margin: 1rem;
      padding: 0;
      background: var(--background-color);
    }
    .terminal {
      margin: 0;
      padding: 0;
      font-family: var(--font-secondary), Menlo, Courier New, monospace;
      font-size: 14px;
      text-rendering: optimizeLegibility;
      color: var(--text-color);
      -webkit-font-smoothing: antialiased;
      cursor: text;
      counter-reset: input;
      background: var(--background-color);
    }
    .terminal .terminal--output {
      white-space: pre-wrap;
      word-break: break-all;
    }
    .terminal .terminal--input {
      counter-increment: input;
      display: flex;
      align-items: center;
    }
    .terminal .terminal--input:before {
      content: "[LIA] $ ";
      color: var(--primary-glow);
      margin-right: 0.5em;
    }
    .terminal .terminal--input input {
      background: transparent;
      color: inherit;
      width: 100%;
      border: none;
      padding: 0;
      margin: 0;
      overflow: auto;
      font-family: inherit;
      font-size: 14px;
      flex-grow: 1;
    }
    .terminal .terminal--input input:focus {
        outline: none;
    }
    .terminal .terminal--output.is-console:before {
      margin-right: 10px;
      content: ">";
    }
    .terminal .terminal--output.is-error {
      color: #ff9999;
    }
    .terminal .terminal--output.is-input-line {
        display: flex;
        align-items: center;
    }
    .terminal .terminal--output.is-input-line:before {
        content: "[LIA] $ ";
        color: var(--primary-glow);
        margin-right: 0.5em;
    }
  </style>
</head>
<body onload="init()">
  <article class="terminal">
    <section id="terminal-output">
      <p class="terminal--output">LIA Shell Initialized. Type 'help' for available commands.</p>
    </section>
    <section class="terminal--input">
      <input type="text" id="terminal-input" wrap="off" onkeydown="terminalInputKeydown(event)">
    </section>
  
  <script>
    var shellCommands = {
      help: function(cmd, args) {
        var response = "Available Commands: \\n\\r";
        for (var command in shellCommands) {
          response += "  " + command + "\\n\\r";
        }
        return response.substring(0, response.length - 2);
      },
      clear: function(cmd, args) {
        var _out = document.getElementById("terminal-output");
        while (_out.childNodes[0]) {
          _out.removeChild(_out.childNodes[0]);
        }
        return 'Terminal cleared!';
      },
      random: function(cmd, args) {
        return Math.random();
      },
      echo: function(cmd, args) {
        return args.join(' ');
      }
    };

    var _in, _out;

    function refocus() {
      _in.blur();
      _in.focus();
    }

    function init() {
      _in = document.getElementById("terminal-input");
      _out = document.getElementById("terminal-output");
      window.addEventListener('click', keepFocusInTextbox, false);
      refocus();
    }

    function keepFocusInTextbox(e) {
      var g = e.target;
      while (g && !g.tagName) {
        g = g.parentNode;
      }
      if (!g || g.tagName.toUpperCase() === "A" || g.tagName.toUpperCase() === "INPUT") {
        return;
      }
      if (window.getSelection && String(window.getSelection())) {
        return;
      }
      refocus();
    }

    function terminalInputKeydown(e) {
      if (e.key === 'Enter') {
        try {
          execute();
        } catch (er) {
          printError(er);
        }
        setTimeout(function() {
          _in.value = "";
        }, 0);
      }
    }

    function println(s, type) {
      var s = String(s);
      var p = document.createElement("p");
      if (type === 'is-input-line') {
          p.textContent = s;
      } else {
          p.appendChild(document.createTextNode(s));
      }
      p.className = 'terminal--output ' + (type || '');
      _out.appendChild(p);
      _out.scrollTop = _out.scrollHeight;
      return p;
    }

    function printError(er) {
      println(er, "is-error");
    }

    function execute() {
      var fullCmd = _in.value;
      if (!fullCmd) return;
      var key = fullCmd.substr(0, fullCmd.indexOf(' ')) || fullCmd;
      var args = fullCmd.substr(fullCmd.indexOf(' ') + 1).split(" ");

      println(fullCmd, 'is-input-line');

      if (shellCommands[key.toLowerCase()]) {
        println(shellCommands[key.toLowerCase()](key.toLowerCase(), args));
      } else {
        printError('Command not found: ' + key);
      }
    }
  <\/script>

</article></body></html>` },
];

export const protocolConfigs: Record<Protocol, { name: string; operators: string[]; promptFile: string; isJson: boolean; }> = {
    omni: { name: 'Omni Orchestrator', operators: ['Execute', 'Plan', 'Delegate'], promptFile: '/prompts/omni_protocol_system_prompt.txt', isJson: true },
    strict: { name: 'Strict Protocol', operators: ['Send', 'System Reforge', 'Shell Augmentation', 'Corpus Analysis', 'Create Log', 'Provision Sandbox'], promptFile: '/prompts/strict_protocol_system_prompt.txt', isJson: true },
    robo: { name: 'Robo Protocol', operators: ['Execute', 'REFORGE: LIA_OS', 'REFORGE: STRICT_PROTO', 'System Analysis', 'Create File'], promptFile: '/prompts/robo_protocol_system_prompt.txt', isJson: true },
    aifse: { name: 'Aifse Assistant', operators: ['Analyze', 'Build', 'Refactor', 'Execute'], promptFile: '/prompts/aifse_protocol_system_prompt.txt', isJson: true },
    clone: { name: 'Clone Protocol', operators: ['Replicate', 'Synthesize', 'Analyze Source', 'Log Anomaly', 'Create Variant'], promptFile: '/prompts/clone_protocol_system_prompt.txt', isJson: true },
    cyber: { name: 'Cyber Protocol', operators: ['Scan Network', 'Analyze Vector', 'Deploy Honeypot', 'Quarantine', 'Purge Threat'], promptFile: '/prompts/cyber_protocol_system_prompt.txt', isJson: true },
    mcp: { name: 'MCP', operators: ['Inspect', 'Test', 'List Protocols'], promptFile: '/prompts/mcp_protocol_system_prompt.txt', isJson: true },
    help: { name: 'System Help', operators: [], promptFile: '/prompts/help_protocol_system_prompt.txt', isJson: false },
};

export const CRITICAL_SYSTEM_FILES = [
    LIA_BOOTSTRAP_FILENAME,
    LIA_UTILITIES_FILENAME,
    LIA_COMMAND_LEGEND_FILENAME,
    LIA_LINUX_COMMANDS_FILENAME,
    CARA_BOOTSTRAP_FILENAME,
    CARA_SYSTEM_PROMPT_FILENAME,
    CARA_BOOTSTRAP_V2_FILENAME,
    METIS_BOOTSTRAP_FILENAME,
    METIS_SYSTEM_PROMPT_FILENAME,
    PUPA_SYSTEM_PROMPT_FILENAME,
    ...Object.values(protocolConfigs).map(p => p.promptFile),
    ...KINKSCAPE_FILENAMES,
    'index.html', // Main UI definition
    '0index.html', // Preview root
    '0shell.html' // Shell root
];