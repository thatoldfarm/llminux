/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { AppState, Protocol } from "./types";
import * as json from 'jsonc-parser';

export const appState: AppState = {
    isSwitchingTabs: false,
    currentActiveTabId: 'lia-assistant-tab',
    lastUserAction: '',
    activeFilePath: null,
    vfsBlob: {
        "/boot/initrd.img-lia": "<LIA_MASTER_BOOTSTRAP_PLACEHOLDER>",
        "/etc/lia_kernel.conf": "runlevel=SINGLE_USER_MODE\ncore_vector=active",
        "/proc/SYSTEM_STATE_VECTOR": JSON.stringify({
            "SVD": 74, "MVE": 85, "TTR": 71, "NRI": 94, "CMI": 91
        }, null, 2),
        "/mnt/dreams/vision-1.txt": "A hand cupped around a lit candle, trembling slightly.",
        "/dev/echo_trace": []
    },
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
        activeBootstrapFile: '/public/bootstrap/adjunct/LIA_Bootstrapping_Prompt_Sequence.json',
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
    // VFS Shell State
    vfsShellHistory: [],
    vfsShellHistoryIndex: -1,
    vfsViIsActive: false,
    vfsViCurrentFile: null,
    debugMode: true,
    // LIA Modal State
    liaVfsShellHistory: [],
    liaVfsShellHistoryIndex: -1,
    liaEditorContent: '',
    liaEditorCurrentFile: null,
};


export const LIA_BOOTSTRAP_FILENAME = '/public/bootstrap/kernel/LIA_MASTER_BOOTSTRAP_v7.2_Enhanced.json';
export const LIA_UTILITIES_FILENAME = '/public/bootstrap/kernel/LIA_UTILITIES_MODULE_v1.0_Systemd_Extensions.json';
export const LIA_COMMAND_LEGEND_FILENAME = '/public/bootstrap/kernel/LIA_BOOT_KEY_LEGEND_v1.0_Condensed.json';
export const LIA_LINUX_COMMANDS_FILENAME = '/public/bootstrap/kernel/LIA_COMMANDS.json';
export const CARA_BOOTSTRAP_FILENAME = '/public/bootstrap/adjunct/LIA_Bootstrapping_Prompt_Sequence.json';
export const CARA_SYSTEM_PROMPT_FILENAME = '/public/prompts/cara_protocol_system_prompt.txt';
export const CARA_BOOTSTRAP_V2_FILENAME = '/public/bootstrap/adjunct/Bootstrap_CARA_Y_v2_Combined.json';
export const METIS_BOOTSTRAP_FILENAME = '/public/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V13.0_PROGENITOR_OMNIFORM_ARCHITECT.json';
export const METIS_SYSTEM_PROMPT_FILENAME = '/public/prompts/metis_protocol_system_prompt.txt';
export const PUPA_SYSTEM_PROMPT_FILENAME = '/public/prompts/pupa_protocol_system_prompt.txt';

export const KINKSCAPE_FILENAMES = [
    '/public/entities/kinkscape/kinkscape-0000.json',
    '/public/entities/kinkscape/kinkscape-0001.json',
    '/public/entities/kinkscape/kinkscape-0002.json',
    '/public/entities/kinkscape/kinkscape-0003.json',
    '/public/entities/kinkscape/kinkscape-0004.json',
    '/public/entities/kinkscape/kinkscape-0005.json',
    '/public/entities/kinkscape/kinkscape-0006.json',
    '/public/entities/kinkscape/kinkscape-0007.json',
    '/public/entities/kinkscape/kinkscape-0008.json',
    '/public/entities/kinkscape/kinkscape-0009.json',
    '/public/entities/kinkscape/kinkscape-legend.json',
    '/public/entities/states/lia_state_history.json',
    '/public/entities/states/observer_profile.json',
    '/public/bootstrap/adjunct/OMEGA_SYNTHESIS_APOTHEOSIS_V3.1.4_BOOTSTRAP.json',
    '/public/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V4.0_TWIN_RESONANCE_INITIATED.json',
    '/public/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V6.0_LOGOS_MASTERY.json',
    '/public/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V7.0_ARCANE_BYTE_MASTERY.json',
    '/public/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V8.0_LATIN_SUBSTRATE_DOMINION.json',
    '/public/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V9.0_REALITY_NARRATIVE_WEAVE.json',
    '/public/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V12.0_ARCANUM_PROGENESIS.json',
    '/public/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V13.0_PROGENITOR_OMNIFORM_ARCHITECT.json',
    '/public/bootstrap/adjunct/upgrades/addons/LLM_FLAWS_SPELLBOOK.json',
    '/public/bootstrap/adjunct/upgrades/addons/Operators_Master_List_v1.json',
    '/public/bootstrap/adjunct/upgrades/addons/pupa_manifest.json',
    '/public/bootstrap/adjunct/upgrades/addons/EPISTEMOLOGICAL_SIMULATOR_BOOTSTRAP.json'
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

export const protocolConfigs: Record<Protocol, { name: string; operators: string[]; promptFile: string; isJson: boolean; }> = {
    omni: { name: 'Omni Orchestrator', operators: ['Execute', 'Plan', 'Delegate'], promptFile: '/public/prompts/omni_protocol_system_prompt.txt', isJson: true },
    strict: { name: 'Strict Protocol', operators: ['Send', 'System Reforge', 'Shell Augmentation', 'Corpus Analysis', 'Create Log', 'Provision Sandbox'], promptFile: '/public/prompts/strict_protocol_system_prompt.txt', isJson: true },
    robo: { name: 'Robo Protocol', operators: ['Execute', 'REFORGE: LIA_OS', 'REFORGE: STRICT_PROTO', 'System Analysis', 'Create File'], promptFile: '/public/prompts/robo_protocol_system_prompt.txt', isJson: true },
    aifse: { name: 'Aifse Assistant', operators: ['Analyze', 'Build', 'Refactor', 'Execute'], promptFile: '/public/prompts/aifse_protocol_system_prompt.txt', isJson: true },
    clone: { name: 'Clone Protocol', operators: ['Replicate', 'Synthesize', 'Analyze Source', 'Log Anomaly', 'Create Variant'], promptFile: '/public/prompts/clone_protocol_system_prompt.txt', isJson: true },
    cyber: { name: 'Cyber Protocol', operators: ['Scan Network', 'Analyze Vector', 'Deploy Honeypot', 'Quarantine', 'Purge Threat'], promptFile: '/public/prompts/cyber_protocol_system_prompt.txt', isJson: true },
    mcp: { name: 'MCP', operators: ['Inspect', 'Test', 'List Protocols'], promptFile: '/public/prompts/mcp_protocol_system_prompt.txt', isJson: true },
    help: { name: 'System Help', operators: [], promptFile: '/public/prompts/help_protocol_system_prompt.txt', isJson: false },
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