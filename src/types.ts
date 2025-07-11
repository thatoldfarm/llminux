
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
    conceptual_impact?: LiaUtilityConceptualImpact;
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

export type AppState = {
    isSwitchingTabs: boolean;
    currentActiveTabId: string;
    vfsFiles: FileBlob[];
    activeFile: FileBlob | null;
    liaKernelChatHistory: ChatMessage[];
    fsUtilChatHistory: ChatMessage[];
    liaAssistantChatHistory: ChatMessage[];
    codeAssistantChatHistory: ChatMessage[];
    vanillaChatHistory: ChatMessage[];
    persistenceLog: string[];
    isPersistenceLoading: boolean;
    aiSettings: AiSettings;
    liaState: LiaState;
    liaUtilitiesConfig: LiaUtilitiesConfig | null;
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
    // UI Commands
    commandPaletteCommands: Command[];
    // LIA Command Search State
    liaCommandList: any[];
};

export interface DefaultFile { name: string; content: string; }