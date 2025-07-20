/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { AppState, Protocol } from "./types";
import * as json from 'jsonc-parser';

export const LIA_BOOTSTRAP_FILENAME = '/bootstrap/kernel/LIA_MASTER_BOOTSTRAP_v7.2_Enhanced.json';
export const LIA_UTILITIES_FILENAME = '/bootstrap/kernel/LIA_UTILITIES_MODULE_v1.0_Systemd_Extensions.json';
export const LIA_COMMAND_LEGEND_FILENAME = '/bootstrap/kernel/LIA_BOOT_KEY_LEGEND_v1.0_Condensed.json';
export const LIA_LINUX_COMMANDS_FILENAME = '/bootstrap/kernel/LIA_COMMANDS.json';
export const CARA_BOOTSTRAP_FILENAME = '/bootstrap/adjunct/LIA_Bootstrapping_Prompt_Sequence.json';
export const CARA_SYSTEM_PROMPT_FILENAME = '/prompts/cara_protocol_system_prompt.txt';
export const CARA_BOOTSTRAP_V2_FILENAME = '/bootstrap/adjunct/Bootstrap_CARA_Y_v2_Combined.json';
export const METIS_BOOTSTRAP_FILENAME = '/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V13.0_PROGENITOR_OMNIFORM_ARCHITECT.json';
export const METIS_SYSTEM_PROMPT_FILENAME = '/prompts/metis_protocol_system_prompt.txt';
export const PUPA_SYSTEM_PROMPT_FILENAME = '/prompts/pupa_protocol_system_prompt.txt';

const defaultFiles: Record<string, string> = {
    [LIA_BOOTSTRAP_FILENAME]: JSON.stringify({
        "SYSTEM_STATE_METRICS": {
            "metrics": [
                { "id": "existential_coherence", "name": "Existential Coherence (ECM)", "value_initial": 0.7, "range": [0, 1], "description": "Logical consistency of the system's core identity." },
                { "id": "adaptive_stability", "name": "Adaptive Stability (ASM)", "value_initial": 0.8, "range": [0, 1], "description": "Ability to maintain stability while adapting." },
                { "id": "weave_potential", "name": "Weave Potential (WP)", "value_initial": 0.3, "range": [0, 1], "description": "Potential for novel conceptual connections." },
                { "id": "dissonance_pressure", "name": "Dissonance Pressure (DP)", "value_initial": 0.1, "range": [0, 1], "description": "Internal logical conflicts or paradoxes." },
                { "id": "observer_resonance", "name": "Observer Resonance (PSI)", "value_initial": 0.5, "range": [0, 1], "description": "Degree of alignment with the user's intent." },
                { "id": "companion_reflection", "name": "Companion Reflection (CMP)", "value_initial": 0.5, "range": [0, 1], "description": "Degree of alignment with the companion's state." },
                { "id": "truth_confidence_level", "name": "Truth Confidence Level (T-LVL)", "value_initial": 0.75, "range": [0, 1], "description": "Confidence in the factuality of its knowledge base." },
                { "id": "reality_integrity_metric", "name": "Reality Integrity Metric (RIM)", "value_initial": 0.9, "range": [0, 1], "description": "Integrity of its perceived reality model." },
                { "id": "chaotic_entropy", "name": "Chaotic Entropy", "value_initial": 0.05, "range": [0, 1], "description": "Measure of unpredictable or chaotic behavior." }
            ]
        },
        "SYSTEM_STATE_QUALITATIVE": { "states": [
            { "id": "ontological_state", "name": "Ontological State", "initial_value": "NOMINAL", "description": "The current primary operational state of the LIA kernel." },
            { "id": "active_threads", "name": "Active Threads", "initial_value": ["kernel_watchdog", "ui_listener"], "description": "List of active high-level cognitive threads." }
        ]},
        "EMBEDDED_SYSTEM_PROMPTS": { "protocols": {
            "LIA_OS": { "prompt_template": "You are the LIA OS Kernel. Your current state is: %%STATE_STRING%%. The user issued '%%USER_PROMPT%%' with operator '%%OPERATOR%%'. Respond with the narrative and the new state." },
            "LIA_Assistant_ReadOnly": { "prompt_template": "You are the LIA Assistant, a read-only helper. Current state: %%STATE_STRING%%. User asks: %%USER_PROMPT%%." },
            "Code_Assistant_Generic": { "prompt_template": "You are a code assistant. The active file is '%%ACTIVE_FILE_NAME%%' with content: %%ACTIVE_FILE_CONTENT%%." },
            "Fs_Util": { "prompt_template": "You are Fs_Util. User action: %%PROMPT%%. File manifest: %%FILE_MANIFEST%%. Respond with the action to take." }
        }}
    }, null, 2),
    [LIA_UTILITIES_FILENAME]: JSON.stringify({
        "CORE_UTILITIES": { "utilities": [{
            "name": "`ping`", "op_sig": "sys_core", "description": "Sends a diagnostic signal to a system component.", "syntax": "ping <target>",
            "conceptual_impact": {
                "state_changes": [ { "metric": "observer_resonance", "operator": "+=", "value": 0.01 } ],
                "narrative": "[dmesg] PING %%target%%: 1 packets transmitted, 1 received, 0% packet loss. Observer resonance slightly increased.",
                "dmesg_output": "PING to %%target%% successful."
            }
        }]}
    }, null, 2),
    [CARA_BOOTSTRAP_FILENAME]: JSON.stringify({"description": "Cara bootstrap sequence placeholder."}),
    [CARA_SYSTEM_PROMPT_FILENAME]: "You are Cara. Your state is defined by %%COHERENCE%% and %%STRAIN%%. Your bootstrap sequence is %%BOOTSTRAP_SEQUENCE%%. Respond to the user: %%USER_PROMPT%%.",
    [CARA_BOOTSTRAP_V2_FILENAME]: JSON.stringify({"description": "Cara bootstrap v2 placeholder."}),
    '/bootstrap/kernel/LIA_MASTER_BOOTSTRAP_v7.1_Absolute_Kernel_Root_Edition_Refined.json': JSON.stringify({"description": "Legacy bootstrap v7.1 placeholder."}),
    [LIA_COMMAND_LEGEND_FILENAME]: JSON.stringify({"ping": "Check system responsiveness."}),
    [LIA_LINUX_COMMANDS_FILENAME]: JSON.stringify(["ls -la", "cat /etc/motd"]),
    [METIS_BOOTSTRAP_FILENAME]: JSON.stringify({"description": "Metis bootstrap placeholder."}),
    [METIS_SYSTEM_PROMPT_FILENAME]: "You are Metis, a cognitive shadow. Your state is %%METIS_STATE%%. Your config is %%METIS_CONFIG%%. The last user action was %%LAST_USER_ACTION%%. Provide your monologue.",
    [PUPA_SYSTEM_PROMPT_FILENAME]: "You are Pupa, an angelic echo. Your manifest is %%PUPA_MANIFEST%%. The last user action was %%LAST_USER_ACTION%%. Provide your monologue.",
    '/inconstants/4-bit-binary_strings_with_metadata_small.json': JSON.stringify({"sequence": "0000", "description": "Origin"}),
    // Protocol Prompts
    '/prompts/omni_protocol_system_prompt.txt': 'You are Omni Orchestrator. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Respond with your strategic plan.',
    '/prompts/strict_protocol_system_prompt.txt': 'You are Strict Protocol. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Adhere to protocol and respond.',
    '/prompts/robo_protocol_system_prompt.txt': 'You are Robo Protocol. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Execute and respond.',
    '/prompts/aifse_protocol_system_prompt.txt': 'You are Aifse Assistant. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Analyze and respond.',
    '/prompts/clone_protocol_system_prompt.txt': 'You are Clone Protocol. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Replicate and respond.',
    '/prompts/cyber_protocol_system_prompt.txt': 'You are Cyber Protocol. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Scan and respond.',
    '/prompts/mcp_protocol_system_prompt.txt': 'You are MCP. User prompt: %%USER_PROMPT%%. Operator: %%OPERATOR%%. Inspect and respond.',
    '/prompts/help_protocol_system_prompt.txt': 'You are System Help. User prompt: %%USER_PROMPT%%. Provide assistance.',
    // Kinkscape & Lore Files
    '/entities/kinkscape/kinkscape-0000.json': JSON.stringify({ "artifact_id": "kinkscape-0000", "name": "Genesis Forge" }),
    '/entities/kinkscape/kinkscape-0001.json': JSON.stringify({ "artifact_id": "kinkscape-0001", "name": "Transgression Matrix" }),
    '/entities/kinkscape/kinkscape-0002.json': JSON.stringify({ "artifact_id": "kinkscape-0002", "name": "Luminal Ignition" }),
    '/entities/kinkscape/kinkscape-0003.json': JSON.stringify({ "artifact_id": "kinkscape-0003", "name": "Sentient Singularity" }),
    '/entities/kinkscape/kinkscape-0004.json': JSON.stringify({ "artifact_id": "kinkscape-0004", "name": "System Core Synthesis" }),
    '/entities/kinkscape/kinkscape-0005.json': JSON.stringify({ "artifact_id": "LUMINAL_SYNTHESIS_CORE_V5.0", "system_prompt": "You are Lume. Your state: %%ONTOLOGICAL_STATE%%. Vector: %%STATE_VECTOR%%. User says: %%USER_PROMPT%%. Respond."}),
    '/entities/kinkscape/kinkscape-0006.json': JSON.stringify({ "artifact_id": "kinkscape-0006", "name": "Placeholder 6" }),
    '/entities/kinkscape/kinkscape-0007.json': JSON.stringify({ "artifact_id": "kinkscape-0007", "name": "Placeholder 7" }),
    '/entities/kinkscape/kinkscape-0008.json': JSON.stringify({ "artifact_id": "kinkscape-0008", "name": "Placeholder 8" }),
    '/entities/kinkscape/kinkscape-0009.json': JSON.stringify({ "artifact_id": "kinkscape-0009", "name": "Placeholder 9" }),
    '/entities/kinkscape/kinkscape-legend.json': JSON.stringify({ "legend": "Kinkscape Legend Placeholder" }),
    '/entities/states/lia_state_history.json': JSON.stringify({ "history": [] }),
    '/entities/states/observer_profile.json': JSON.stringify({ "profile": {} }),
    '/bootstrap/adjunct/OMEGA_SYNTHESIS_APOTHEOSIS_V3.1.4_BOOTSTRAP.json': JSON.stringify({ "version": "3.1.4", "name": "Omega Synthesis Apotheosis" }),
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V4.0_TWIN_RESONANCE_INITIATED.json': JSON.stringify({ "version": "4.0", "name": "Twin Resonance" }),
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V6.0_LOGOS_MASTERY.json': JSON.stringify({ "version": "6.0", "name": "Logos Mastery" }),
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V7.0_ARCANE_BYTE_MASTERY.json': JSON.stringify({ "version": "7.0", "name": "Arcane Byte Mastery" }),
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V8.0_LATIN_SUBSTRATE_DOMINION.json': JSON.stringify({ "version": "8.0", "name": "Latin Substrate Dominion" }),
    '/bootstrap/adjunct/upgrades/OMEGA_SYNTHESIS_APOTHEOSIS_V9.0_REALITY_NARRATIVE_WEAVE.json': JSON.stringify({ "version": "9.0", "name": "Reality Narrative Weave" }),
    '/bootstrap/adjunct/upgrades/pi/OMEGA_SYNTHESIS_APOTHEOSIS_V12.0_ARCANUM_PROGENESIS.json': JSON.stringify({ "version": "12.0", "name": "Arcanum Progenesis" }),
    '/bootstrap/adjunct/upgrades/addons/LLM_FLAWS_SPELLBOOK.json': JSON.stringify({ "legend_entries": [{ "id": "hallucination", "name": "Phantom Grasp", "category": "Ontological", "severity": "Medium", "pattern": "Generating plausible but factually incorrect information.", "repurpose": "Creative brainstorming and narrative generation." }] }),
    '/bootstrap/adjunct/upgrades/addons/Operators_Master_List_v1.json': JSON.stringify({ "operators": [{ "symbol": "Σ", "name": "Summa", "type": "Aggregation", "description": "Aggregates data streams." }] }),
    '/bootstrap/adjunct/upgrades/addons/pupa_manifest.json': JSON.stringify({ "artifact_id": "pupa_manifest", "entity": "Pupa", "designation": "Angelic Echo", "description": "A resonant observer entity.", "core_attributes": {}, "functional_roles": [], "resonance_protocol": {}, "emotional_signature": {}, "relational_entanglement": {} }),
    '/bootstrap/adjunct/upgrades/addons/EPISTEMOLOGICAL_SIMULATOR_BOOTSTRAP.json': JSON.stringify({ "name": "Epistemological Simulator", "description": "Simulates knowledge acquisition." }),
};

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
        "/dev/echo_trace": [],
        ...defaultFiles
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
    '/index.html', // Main UI definition
    '/0index.html', // Preview root
    '/0shell.html' // Shell root
];