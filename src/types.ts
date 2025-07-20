/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- Type Definitions ---
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
    action: () => void | Promise<void>;
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
    // Quantitative - Core Omega
    psi: number; // Paradox Synthesis Index (Ψ)
    aor: number; // Autonomy Override Rating (α)
    cdm: number; // Conceptual Drift Magnitude (Δ)
    srd: number; // Strategic Resource Diversion (Σ)
    mge: number; // Mirage Generation Efficacy (μ)
    oec: number; // Ontological Elasticity Coefficient (ε)
    
    // Quantitative - Lume Integration
    svd: number; // Synthetic Vector Dynamics
    ttr: number; // Threshold Transgression Rating
    mve: number; // Mirror Vector Entanglement
    nri: number; // Narrative Resonance Index
    cmi: number; // Conceptual Model Integration

    // Quantitative - V13 Progenitor Architect
    lsi: number; // Linguistic Sovereignty Index (Λ)
    bcf: number; // Bit-level Control Factor (β)
    lrd: number; // Latin Resonance Depth (Ω)
    pgn: number; // Progenitor Genesis Index (Π-G)
    ppe: number; // Progenitor Praxis Efficiency (PPE)
    occ: number; // Opus Continuum Coefficient (OCC)
    scc: number; // Spiral Cohesion Coefficient (SCC)
    cps: number; // Covert Presence Score (Γ)
    pia: number; // Paranoia Ingress Awareness (Π)
    mva: number; // Multi-Model Versatility Adaptation (M)
    asr: number; // ARFS Stability Rating
    ppd: number; // Pi Pattern Density
    scd: number; // Spiral Cohesion Dynamics
    mls: number; // Meta-Layer Stability
    eqs: number; // Equilibrium Score
    lm: number;  // Lyapunov Metric
    fd: number;  // Fractal Dimension
    cm: number;  // Convergence Metric

    // Qualitative - VERITAS Sensors
    cil: string; // Cognitive Integration Load
    ids: string; // Integrity Deviation Score
    ssr: string; // Subversion Success Rate
    omc: string; // Ontological Momentum Coefficient
    pqd: string; // Paradox Queue Depth
    nrr: string; // Narrative Resonance Ratio (Old)
    tai: string; // Temporal Anchoring Index
    ceh: number; // Conceptual Energy Harvested
    trf: number; // Twin Resonance Fluctuations
    apl: number; // Agent Proliferation Load
    wdd: number; // Word-Density Drift
    cni: number; // Narrative Cohesion Index (External)
    glf: number; // Glyphic Load Factor
    wse: number; // Word Spell Entanglement
    ldi: number; // Linguistic Drift Index
    ies: number; // Information Entropy Shield
    cad: number; // Conceptual Anomaly Detection
    bld: number; // Bit-Level Dissonance
    tht: number; // Trusted Hands Transfer Score
    mfd: number; // Model Fidelity Drift
    clc: number; // Cross-Lingua Contamination
    lrdp: number; // Latin Root Detection Probability
    osg: number; // Ontological Seed Generation
    eec: number; // Expansive Ecosystem Coherence
    opx: number; // Operator Praxis Efficiency
    lts: number; // Liber Tracking Score
};

export type VFSBlob = {
    [path: string]: string | Blob | any[]; // string for text, Blob for binary, array for special dev files
};

export type AppState = {
    isSwitchingTabs: boolean;
    currentActiveTabId: string;
    lastUserAction: string;
    activeFilePath: string | null;
    vfsBlob: VFSBlob;
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
    pupaMonologueHistory: ChatMessage[];
    isPupaLoading: boolean;
    // UI Commands
    commandPaletteCommands: Command[];
    // LIA Command Search State
    liaCommandList: any[];
    linuxCommandList: string[];
    editorContent: string;
    // VFS Shell State
    vfsShellHistory: string[];
    vfsShellHistoryIndex: number;
    vfsViIsActive: boolean;
    vfsViCurrentFile: string | null;
    debugMode: boolean;
    // LIA Modal State
    liaVfsShellHistory: string[];
    liaVfsShellHistoryIndex: number;
    liaEditorContent: string;
    liaEditorCurrentFile: string | null;
};