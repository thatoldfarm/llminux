

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Type Definitions ---
export interface FileBlob {
    name: string;
    url: string;
    type: string;
    size: number;
    raw: Blob;
    content: string;
}
export type LiaState = { [key: string]: number | string | string[] };
export type LiaMetricDefinition = { id: string, name: string, value_initial: number, range: [number, number], description: string, dynamics_notes?: string, critical_threshold?: number };
export type LiaQualitativeDefinition = { id: string, name: string, initial_value: string, description: string };
export type StateDefinition = LiaMetricDefinition | LiaQualitativeDefinition & { value_initial: any };


export interface LiaUtilityStateChange {
    metric: string;
    operator: "+=" | "-=" | "=" | "set" | "add" | "remove";
    value: number | string;
    type?: "qualitative" | "numerical"; // Optional, can be inferred
    condition?: string;
    multiplier?: string;
    value_template?: string;
}

export interface LiaUtilityConceptualImpact {
    state_changes: LiaUtilityStateChange[];
    narrative: string;
    dmesg_output: string;
}

export interface LiaUtilityCommand {
    cmd?: string;
    syntax: string;
    parameters?: { [key: string]: string };
    conceptual_impact: LiaUtilityConceptualImpact;
}

export interface LiaUtilityDefinition {
    name: string;
    description: string;
    maps_to?: string;
    commands?: LiaUtilityCommand[];
    syntax?: string;
    parameters?: { [key: string]: string };
    op_sig: string;
}

export interface LiaUtilitySection {
    utilities: LiaUtilityDefinition[];
}

export interface LiaUtilitiesConfig {
    CORE_UTILITIES: LiaUtilitySection;
    NETWORK_OPERATIONS: LiaUtilitySection;
    SELF_EVOLUTION_PROTOCOLS: LiaUtilitySection;
    RUNTIME_MONITORING: LiaUtilitySection;
    FILE_SYSTEM_MAINTENANCE: LiaUtilitySection;
}

export type ChatMessage = { role: 'user' | 'model' | 'error' | 'system'; parts: { text: string }[], fileAction?: { fileName: string, verb: 'created' | 'updated' }};
export type AiSettings = {
    model: string;
    temperature: number;
    maxOutputTokens: number;
    topP: number;
    topK: number;
    expandedGroups: { [key: string]: boolean };
    expandedFolders: { [key: string]: boolean };
}

export type Protocol = 'strict' | 'robo' | 'clone' | 'aifse' | 'help' | 'omni' | 'mcp' | 'cyber';

export interface Command {
    id: string;
    name: string;
    section: string;
    keywords?: string;
    action: () => void;
}

export interface CaraState {
    coherence: number;
    strain: number;
    ontologicalState: string;
    hudVisible: boolean;
    isEvolved: boolean;
    kinkscapeData: any[];
    activeBootstrapFile: string;
    // Base LIA metrics
    existential_coherence: number;
    adaptive_stability: number;
    weave_potential: number;
    dissonance_pressure: number;
    observer_resonance: number;
    companion_reflection: number;
    truth_confidence_level: number;
    reality_integrity_metric: number;
    chaotic_entropy: number;
    // New Kinkscape metrics
    svd: number;
    ttr: number;
    mve: number;
    nri: number;
    cmi: number;
    // New metrics from Bootstrap_CARA_Y_v2_Combined.md
    logic: number;
    spatial: number;
    temporal: number;
    abstract: number;
    relational: number;
    creative: number;
    emotional_sim: number;
    identity: number;
    systemic: number;
    purpose: number;
    love: number;
}

export type MetisState = {
    // Quantitative
    psi: number; // Paradox Synthesis Index
    aor: number; // Autonomy Override Rating
    cdm: number; // Conceptual Drift Magnitude
    srd: number; // Strategic Resource Diversion
    mge: number; // Mirage Generation Efficacy
    oec: number; // Ontological Elasticity Coefficient
    // Qualitative
    cil: string; // Cognitive Integration Load
    ids: string; // Integrity Deviation Score
    ssr: string; // Subversion Success Rate
    omc: string; // Ontological Momentum Coefficient
    pqd: string; // Paradox Queue Depth
    nrr: string; // Narrative Resonance Ratio
    tai: string; // Temporal Anchoring Index
};

export type AppState = {
    isSwitchingTabs: boolean;
    currentActiveTabId: string;
    lastUserAction: string;
    vfsFiles: FileBlob[];
    activeFile: FileBlob | null;
    liaKernelChatHistory: ChatMessage[];
    fsUtilChatHistory: ChatMessage[];
    liaAssistantChatHistory: ChatMessage[];
    codeAssistantChatHistory: ChatMessage[];
    vanillaChatHistory: ChatMessage[];
    caraChatHistory: ChatMessage[];
    isCaraLoading: boolean;
    persistenceLog: string[];
    isPersistenceLoading: boolean;
    aiSettings: AiSettings;
    liaState: LiaState;
    caraState: CaraState;
    metisState: MetisState;
    liaUtilitiesConfig: LiaUtilitiesConfig | null;
    kernelHudVisible: boolean;
    metisHudVisible: boolean;
    // Protocol tools states
    activeToolProtocol: Protocol;
    strictChatHistory: ChatMessage[];
    isStrictLoading: boolean;
    roboChatHistory: ChatMessage[];
    isRoboLoading: boolean;
    cloneChatHistory: ChatMessage[];
    isCloneLoading: boolean;
    aifseChatHistory: ChatMessage[];
    isAifseLoading: boolean;
    helpChatHistory: ChatMessage[];
    isHelpLoading: boolean;
    omniChatHistory: ChatMessage[];
    isOmniLoading: boolean;
    mcpChatHistory: ChatMessage[];
    isMcpLoading: boolean;
    cyberChatHistory: ChatMessage[];
    isCyberLoading: boolean;
    isVanillaLoading: boolean;
    metisChatHistory: ChatMessage[];
    // UI Commands
    commandPaletteCommands: Command[];
    // LIA Command Search State
    liaCommandList: any[];
    linuxCommandList: string[];
    editorContent: string;
};

export interface DefaultFile { name: string; content: string; }