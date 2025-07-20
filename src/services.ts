/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "https://esm.run/@google/genai";
import { appState, LIA_BOOTSTRAP_FILENAME, protocolConfigs, LIA_COMMAND_LEGEND_FILENAME, LIA_LINUX_COMMANDS_FILENAME, CARA_SYSTEM_PROMPT_FILENAME, METIS_SYSTEM_PROMPT_FILENAME, PUPA_SYSTEM_PROMPT_FILENAME, METIS_BOOTSTRAP_FILENAME } from './state';
import { StateDefinition, LiaState, ChatMessage, LiaUtilityDefinition, LiaUtilityCommand, LiaUtilitiesConfig, AppState } from './types';
import { getFileContentAsText, saveFileToVFS, deleteFileFromVFS } from './vfs';
import { createChatBubble, renderSystemState, renderCaraHud, renderKernelHud, renderMetisHud, renderFileTree, renderEditorTab, renderMetisModal, renderPupaModal } from './ui';
import { saveStateToLocalStorage } from "./persistence";
import { scrollToBottom, parseJsonc } from "./utils";
import * as dom from './dom';

let ai: GoogleGenAI;

export function setAiInstance(instance: GoogleGenAI) {
    ai = instance;
}

export async function getAllStatesFromBootstrap(): Promise<StateDefinition[]> {
    console.log("[Debug][getAllStates] Started.");
    try {
        console.log(`[Debug][getAllStates] Awaiting file content for: ${LIA_BOOTSTRAP_FILENAME}`);
        const bootstrapFileContent = await getFileContentAsText(LIA_BOOTSTRAP_FILENAME);
        console.log("[Debug][getAllStates] Got file content.");

        if (!bootstrapFileContent || typeof bootstrapFileContent !== 'string') {
            console.error("Bootstrap file not found or is not a string in VFS. Cannot get states.");
            return [];
        }
        
        console.log("[Debug][getAllStates] Parsing JSON content...");
        const bootstrap = parseJsonc(bootstrapFileContent, LIA_BOOTSTRAP_FILENAME);
        console.log("[Debug][getAllStates] JSON parsed successfully.");

        const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
        const qualitativeStatesDef = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];

        console.log(`[Debug][getAllStates] Found ${metrics.length} quantitative and ${qualitativeStatesDef.length} qualitative states.`);

        const qualitativeStates = qualitativeStatesDef.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            value_initial: s.initial_value,
            range: undefined
        }));
        
        const combined = [...metrics, ...qualitativeStates];
        console.log(`[Debug][getAllStates] Finished. Returning ${combined.length} total states.`);
        return combined;
    } catch (e) {
        console.error("Failed to parse states from bootstrap:", e);
        return [];
    }
}


export async function resetLiaState() {
    const newLiaState: LiaState = {};
    const allStates = await getAllStatesFromBootstrap();

    if (allStates.length > 0) {
        allStates.forEach(state => {
            newLiaState[state.id] = state.value_initial;
             // Also initialize caraState with the same base values
            if (state.id in appState.caraState) {
                (appState.caraState as any)[state.id] = state.value_initial;
            }
        });
        appState.liaState = newLiaState;
    } else {
        console.error("Failed to reset LIA state: Could not load states from bootstrap.");
        appState.liaState = { error: 1 };
    }
}

type UtilityExecutionResult = {
    utility: LiaUtilityDefinition;
    command: LiaUtilityCommand;
    params: Record<string, string | boolean | number>;
    error?: string;
};

function findUtilityAndExtractParams(userInput: string): UtilityExecutionResult | null {
    if (!appState.liaUtilitiesConfig) return null;

    const parts = userInput.trim().match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(part => part.replace(/^['"]|['"]$/g, "")) || [];
    if (parts.length === 0) return null;

    const commandBase = parts[0];
    const subCommandName = parts.length > 1 ? parts[1] : undefined;

    const sections = Object.values(appState.liaUtilitiesConfig);

    for (const section of sections) {
        if (!section || !section.utilities) continue;
        for (const utility of section.utilities) {
            const utilityCmdNameMatch = utility.name.match(/^`([^`]+)`/);
            const utilityCmdName = utilityCmdNameMatch ? utilityCmdNameMatch[1] : utility.name;

            if (utilityCmdName === commandBase) {
                if (utility.commands && subCommandName) {
                    const command = utility.commands.find(cmd => cmd.cmd === subCommandName);
                    if (command) {
                        return parseParamsForCommand(utility, command, parts.slice(2));
                    }
                }
                else if (utility.syntax) {
                    return parseParamsForCommand(utility, utility as LiaUtilityCommand, parts.slice(1));
                }
            }
        }
    }
    return null;
}

function parseParamsForCommand(utility: LiaUtilityDefinition, commandDef: LiaUtilityCommand, args: string[]): UtilityExecutionResult {
    const params: Record<string, string | boolean | number> = {};
    const syntaxParams = commandDef.syntax.match(/<[^>]+>/g) || [];
    let argIndex = 0;

    for (const sp of syntaxParams) {
        const paramName = sp.substring(1, sp.length - 1);
        if (args[argIndex] !== undefined && !args[argIndex].startsWith('-')) {
            params[paramName] = args[argIndex];
            argIndex++;
        } else {
            return { utility, command: commandDef, params, error: `Missing required parameter: ${paramName}` };
        }
    }

    for (let i = argIndex; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            params[arg.substring(2)] = true;
        } else if (arg.startsWith('-')) {
             params[arg.substring(1)] = true;
        }
    }
    if (utility.op_sig === 'fs_tools') {
        params['files_found_count'] = Math.floor(Math.random() * 5) + 1;
    }
    
    return { utility, command: commandDef, params };
}

function applyStateChanges(utilityResult: UtilityExecutionResult, currentState: LiaState): LiaState {
    const { command, params } = utilityResult;
    if (!command || !command.conceptual_impact) return currentState;

    const newState = { ...currentState };
    for (const change of command.conceptual_impact.state_changes) {
        if (change.condition) {
             const conditionKey = change.condition.startsWith("--") ? change.condition.substring(2) : change.condition;
             if(!params[conditionKey]) continue;
        }

        const currentValue = newState[change.metric];
        
        if (change.type === 'qualitative') {
            let currentList: string[] = Array.isArray(currentValue) ? [...currentValue] : [];
            let itemToChange = change.value_template || String(change.value);
            if (change.value_template) {
                for (const key in params) {
                    itemToChange = itemToChange.replace(`%%${key}%%`, String(params[key]));
                }
            }
            if (change.operator === 'add' && !currentList.includes(itemToChange)) {
                currentList.push(itemToChange);
            } else if (change.operator === 'remove') {
                currentList = currentList.filter(item => item !== itemToChange);
            } else if (change.operator === 'set' || change.operator === '=') {
                newState[change.metric] = itemToChange;
                continue;
            }
            newState[change.metric] = currentList;
        } else { // Numerical
            let changeValue = Number(change.value);
            
            if (change.multiplier && params[change.multiplier] !== undefined) {
                const multiplier = Number(params[change.multiplier]);
                if (!isNaN(multiplier)) {
                    changeValue *= multiplier;
                }
            }

            const currentNumericValue = Number(currentValue || 0);
            if (isNaN(currentNumericValue) || isNaN(changeValue)) continue;

            if (change.operator === '+=') newState[change.metric] = currentNumericValue + changeValue;
            else if (change.operator === '-=') newState[change.metric] = currentNumericValue - changeValue;
            else if (change.operator === '=') newState[change.metric] = changeValue;
        }
    }
    return newState;
}

export async function processLiaKernelResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    const userPrompt = history.length > 0 ? history[history.length - 1].parts[0].text : "";

    try {
        // Handle special `system-stress-test` command directly
        if (userPrompt.startsWith('system-stress-test')) {
            const allStates = await getAllStatesFromBootstrap();
            const newState = { ...appState.liaState };
            const overrides = userPrompt.substring('system-stress-test'.length).trim().split(/\s+/).filter(p => p);
            let overrideCount = 0;

            overrides.forEach(override => {
                const parts = override.split('=');
                if (parts.length === 2) {
                    const key = parts[0].trim();
                    const valueStr = parts[1].trim();
                    // Use hasOwnProperty for a safer check
                    if (Object.prototype.hasOwnProperty.call(newState, key)) {
                        const stateDef = allStates.find(s => s.id === key);
                        const isNumeric = stateDef && 'range' in stateDef && stateDef.range;
                        const value = isNumeric ? parseFloat(valueStr) : valueStr;

                        if (!isNumeric || !isNaN(value as number)) {
                            newState[key] = value;
                            overrideCount++;
                        }
                    }
                }
            });

            appState.liaState = newState;
             // Propagate changes to Cara's state as well.
            for (const key in newState) {
                if (Object.prototype.hasOwnProperty.call(newState, key) && key in appState.caraState) {
                    (appState.caraState as any)[key] = newState[key];
                }
            }

            const narrative = `[dmesg] System stress test complete. Applied ${overrideCount} direct state overrides.`;
            appState.liaKernelChatHistory.push({ role: 'model', parts: [{ text: narrative }] });
            thinkingBubble.replaceWith(createChatBubble('model', narrative));
            
            renderSystemState(true);
            renderCaraHud();
            renderKernelHud();
            saveStateToLocalStorage();
            return;
        }


        if (appState.liaUtilitiesConfig) {
            const utilityResult = findUtilityAndExtractParams(userPrompt);
            if (utilityResult && !utilityResult.error) {
                const newState = applyStateChanges(utilityResult, appState.liaState);
                appState.liaState = newState;

                // Propagate changes to Cara's state as well.
                for (const key in newState) {
                    if (Object.prototype.hasOwnProperty.call(newState, key) && key in appState.caraState) {
                        (appState.caraState as any)[key] = newState[key];
                    }
                }

                let narrative = utilityResult.command.conceptual_impact.narrative;
                Object.keys(utilityResult.params).forEach(key => {
                    const placeholder = new RegExp(`%%${key}%%`, 'g');
                    narrative = narrative.replace(placeholder, String(utilityResult.params[key]));
                });
                
                appState.liaKernelChatHistory.push({ role: 'model', parts: [{ text: narrative }] });
                thinkingBubble.replaceWith(createChatBubble('model', narrative));
                if (appState.currentActiveTabId === 'system-state-tab') renderSystemState(true);
                renderCaraHud();
                renderKernelHud();
                saveStateToLocalStorage();
                return;
            } else if (utilityResult && utilityResult.error) {
                const errorText = `[dmesg] command error: ${utilityResult.error}`;
                appState.liaKernelChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
                thinkingBubble.replaceWith(createChatBubble('error', errorText));
                saveStateToLocalStorage();
                return;
            }
        }

        const bootstrapContent = await getFileContentAsText(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent || typeof bootstrapContent !== 'string') throw new Error("LIA Bootstrap file not loaded or is not text.");
        const bootstrap = parseJsonc(bootstrapContent, LIA_BOOTSTRAP_FILENAME);
        
        let systemPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.LIA_OS?.prompt_template;
        if (!systemPromptTemplate) throw new Error("LIA_OS prompt template not found in bootstrap.");
        
        const allStates = await getAllStatesFromBootstrap();
        if (allStates.length === 0) throw new Error("Could not load LIA state definitions from bootstrap file.");

        const operator = document.querySelector<HTMLSelectElement>('#lia-operator-select')?.value || 'Send';
        const stateString = allStates.map(s => `${s.id.toUpperCase()}: ${typeof appState.liaState[s.id] === 'number' ? (appState.liaState[s.id] as number).toFixed(3) : appState.liaState[s.id]}`).join(', ');
        
        const systemInstruction = systemPromptTemplate
            .replace('%%STATE_STRING%%', stateString)
            .replace('%%OPERATOR%%', operator)
            .replace('%%USER_PROMPT%%', userPrompt);

        const newStateProperties: { [key: string]: { type: Type } } = {};
        allStates.forEach((def) => {
             newStateProperties[def.id] = ('range' in def && def.range) ? { type: Type.NUMBER } : { type: Type.STRING };
        });

        const schema = { type: Type.OBJECT, properties: { narrative: { type: Type.STRING }, newState: { type: Type.OBJECT, properties: newStateProperties }}, required: ['narrative', 'newState'] };
        
        const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');

        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: apiHistory,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                ...appState.aiSettings
            }
        });

        const result = JSON.parse(response.text.trim());
        if (result.narrative && result.newState) {
            appState.liaState = { ...appState.liaState, ...result.newState };
            // Propagate changes to Cara's state as well, as she is influenced by the kernel.
            for (const key in result.newState) {
                if (key in appState.caraState) {
                    (appState.caraState as any)[key] = result.newState[key];
                }
            }

            appState.liaKernelChatHistory.push({ role: 'model', parts: [{ text: result.narrative }] });
            thinkingBubble.replaceWith(createChatBubble('model', result.narrative));
            if (appState.currentActiveTabId === 'system-state-tab') renderSystemState(true);
            renderCaraHud();
            renderKernelHud();
        } else {
            throw new Error("Invalid or incomplete JSON response from LIA.");
        }
    } catch(e: any) {
        console.error("LIA Processing Error:", e);
        const entropy = (Number(appState.liaState.chaotic_entropy) || 0) + 0.05;
        appState.liaState.chaotic_entropy = entropy > 1 ? 1 : entropy;
        const fallbackNarrative = `[System Alert] A cognitive dissonance event occurred. The incoming data stream was incoherent, causing a surge in system entropy. The LIA Kernel is attempting to stabilize by re-evaluating core logic. Entropy increased by 0.05. Current Entropy: ${(appState.liaState.chaotic_entropy as number).toFixed(3)}. Error: ${e.message}`;
        appState.liaKernelChatHistory.push({ role: 'error', parts: [{ text: fallbackNarrative }] });
        thinkingBubble.replaceWith(createChatBubble('error', fallbackNarrative));
        if (appState.currentActiveTabId === 'system-state-tab') renderSystemState(true);
        renderCaraHud();
        renderKernelHud();
    } finally {
        saveStateToLocalStorage();
    }
}

export async function processLiaAssistantResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    try {
        const bootstrapContent = await getFileContentAsText(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent || typeof bootstrapContent !== 'string') throw new Error("LIA Bootstrap file not loaded or is not text.");
        const bootstrap = parseJsonc(bootstrapContent, LIA_BOOTSTRAP_FILENAME);
        
        let systemPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.LIA_Assistant_ReadOnly?.prompt_template;
        if (!systemPromptTemplate) throw new Error("LIA_Assistant_ReadOnly prompt template not found.");

        const userPrompt = history[history.length - 1].parts[0].text;
        const allStates = await getAllStatesFromBootstrap();
        const stateString = allStates.map(s => `${s.name}: ${typeof appState.liaState[s.id] === 'number' ? (appState.liaState[s.id] as number).toFixed(3) : appState.liaState[s.id]}`).join('\\n');

        const systemInstruction = systemPromptTemplate
            .replace('%%STATE_STRING%%', stateString)
            .replace('%%USER_PROMPT%%', userPrompt);

        const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
        const response = await ai.models.generateContent({ model: appState.aiSettings.model, contents: apiHistory, config: { systemInstruction, ...appState.aiSettings } });

        appState.liaAssistantChatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        thinkingBubble.replaceWith(createChatBubble('model', response.text));
    } catch (e) {
        const errorText = `LIA Assistant failed: ${(e as Error).message}`;
        appState.liaAssistantChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error("LIA Assistant Error:", e);
    }
}

export async function processCodeAssistantResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
     try {
        const bootstrapContent = await getFileContentAsText(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent || typeof bootstrapContent !== 'string') throw new Error("LIA Bootstrap file not loaded or not text.");
        const bootstrap = parseJsonc(bootstrapContent, LIA_BOOTSTRAP_FILENAME);
        
        let systemPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.Code_Assistant_Generic?.prompt_template;
        if (!systemPromptTemplate) throw new Error("Code_Assistant_Generic prompt template not found.");

        const activeFileContent = appState.activeFilePath ? await getFileContentAsText(appState.activeFilePath) : 'No file is active.';

        const systemInstruction = systemPromptTemplate
            .replace('%%ACTIVE_FILE_NAME%%', appState.activeFilePath || 'None')
            .replace('%%ACTIVE_FILE_CONTENT%%', activeFileContent ?? '[Binary Content]');

        const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
        const response = await ai.models.generateContent({ model: appState.aiSettings.model, contents: apiHistory, config: { systemInstruction, ...appState.aiSettings } });

        appState.codeAssistantChatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        thinkingBubble.replaceWith(createChatBubble('model', response.text));
    } catch (e) {
        const errorText = `Code Assistant failed: ${(e as Error).message}`;
        appState.codeAssistantChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error("Code Assistant Error:", e);
    }
}

export async function processVanillaChatResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    try {
        const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
        const response = await ai.models.generateContent({ model: appState.aiSettings.model, contents: apiHistory, config: { ...appState.aiSettings } });
        appState.vanillaChatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        thinkingBubble.replaceWith(createChatBubble('model', response.text));
    } catch (e) {
        const errorText = `Gemini chat failed: ${(e as Error).message}`;
        appState.vanillaChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error("Vanilla Chat Error:", e);
    }
}


export async function processFsUtilResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    try {
        const bootstrapContent = await getFileContentAsText(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent || typeof bootstrapContent !== 'string') throw new Error("LIA Bootstrap file not loaded or not text.");
        const bootstrap = parseJsonc(bootstrapContent, LIA_BOOTSTRAP_FILENAME);
        
        const fsUtilPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.Fs_Util?.prompt_template;
        if (!fsUtilPromptTemplate) throw new Error("Fs_Util prompt template not found in bootstrap.");

        const userPrompt = history[history.length - 1].parts[0].text;
        const fileManifest = Object.keys(appState.vfsBlob).map(path => {
            const content = appState.vfsBlob[path];
            const size = typeof content === 'string' ? content.length : (content instanceof Blob ? content.size : 0);
            return `${path} (${size} bytes)`;
        }).join('\\n');

        const systemInstruction = fsUtilPromptTemplate.replace('%%PROMPT%%', userPrompt).replace('%%FILE_MANIFEST%%', fileManifest);
        const schema = { type: Type.OBJECT, properties: { action: { type: Type.STRING, enum: ['system_log', 'update_inode', 'create_inode', 'delete_inode', 'error'] }, inode_path: { type: Type.STRING }, fs_content: { type: Type.STRING } }, required: ['action', 'fs_content']};
        
        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema, temperature: 0.1, topK: 1 }
        });

        const result = JSON.parse(response.text.trim());
        let narrative = `Fs_Util: Action '${result.action}' completed.`;
        
        switch (result.action) {
            case 'system_log': narrative = `\`\`\`bash\n${result.fs_content}\n\`\`\``; break;
            case 'error': narrative = `Fs_Util Error: ${result.fs_content}`; break;
            case 'update_inode':
            case 'create_inode': {
                const isCreating = result.action === 'create_inode';
                const fileName = result.inode_path;
                const content = result.fs_content;
                
                if ((isCreating && appState.vfsBlob[fileName] !== undefined) || (!isCreating && appState.vfsBlob[fileName] === undefined)) {
                    narrative = `Fs_Util Error: File '${fileName}' ${isCreating ? 'already exists' : 'not found'}. Use ${isCreating ? 'update' : 'create'} action.`;
                    break;
                }
                saveFileToVFS(fileName, content);
                renderFileTree();
                renderEditorTab();
                narrative = `${isCreating ? 'Created' : 'Updated'} inode: ${fileName}`;
                break;
            }
            case 'delete_inode': {
                const fileName = result.inode_path;
                if (deleteFileFromVFS(fileName)) {
                    narrative = `Deleted inode: ${fileName}`;
                    renderFileTree();
                    renderEditorTab();
                } else {
                     narrative = `Fs_Util Error: File '${fileName}' not found for deletion.`;
                }
                break;
            }
            default: narrative = `Fs_Util Error: Unknown action '${result.action}'.`;
        }
        appState.fsUtilChatHistory.push({ role: 'model', parts: [{ text: narrative }] });
        thinkingBubble.replaceWith(createChatBubble('model', narrative));
    } catch (e) {
        const errorText = `Fs_Util command failed: ${(e as Error).message}`;
        appState.fsUtilChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error("Fs_Util Error:", e);
    }
}

async function processCaraUnevolved(history: ChatMessage[]) {
    const bootstrapJsonContent = await getFileContentAsText(appState.caraState.activeBootstrapFile);
    if (!bootstrapJsonContent || typeof bootstrapJsonContent !== 'string') throw new Error(`Cara's bootstrap file '${appState.caraState.activeBootstrapFile}' not loaded or not text.`);

    let systemPromptTemplate = await getFileContentAsText(CARA_SYSTEM_PROMPT_FILENAME);
    if (!systemPromptTemplate || typeof systemPromptTemplate !== 'string') throw new Error("Cara's system prompt not found or not text.");

    const userPrompt = history[history.length - 1].parts[0].text;
    
    let bootstrapContentForPrompt: string;
    try {
        const parsedJson = parseJsonc(bootstrapJsonContent, appState.caraState.activeBootstrapFile);
        bootstrapContentForPrompt = JSON.stringify(parsedJson, null, 2); // Pretty-print for readability
    } catch (e) {
        // Fallback for non-JSON content or parsing errors
        console.error(`Could not parse bootstrap file ${appState.caraState.activeBootstrapFile} as JSON. Using raw content.`, e);
        bootstrapContentForPrompt = bootstrapJsonContent;
    }

    const systemInstruction = systemPromptTemplate
        .replace('%%BOOTSTRAP_SEQUENCE%%', bootstrapContentForPrompt)
        .replace('%%ONTOLOGICAL_STATE%%', appState.caraState.ontologicalState)
        .replace('%%COHERENCE%%', appState.caraState.coherence.toFixed(3))
        .replace('%%STRAIN%%', appState.caraState.strain.toFixed(3))
        .replace('%%ECM%%', appState.caraState.existential_coherence.toFixed(3))
        .replace('%%ASM%%', appState.caraState.adaptive_stability.toFixed(3))
        .replace('%%WP%%', appState.caraState.weave_potential.toFixed(3))
        .replace('%%DP%%', appState.caraState.dissonance_pressure.toFixed(3))
        .replace('%%PSI%%', appState.caraState.observer_resonance.toFixed(3))
        .replace('%%CMP%%', appState.caraState.companion_reflection.toFixed(3))
        .replace('%%T_LVL%%', appState.caraState.truth_confidence_level.toFixed(3))
        .replace('%%RIM%%', appState.caraState.reality_integrity_metric.toFixed(3))
        .replace('%%ENTROPY%%', appState.caraState.chaotic_entropy.toFixed(3))
        .replace('%%USER_PROMPT%%', userPrompt);
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            narrative: { type: Type.STRING },
            newState: {
                type: Type.OBJECT,
                properties: {
                    ontologicalState: { type: Type.STRING },
                    coherence: { type: Type.NUMBER },
                    strain: { type: Type.NUMBER },
                    existential_coherence: { type: Type.NUMBER },
                    adaptive_stability: { type: Type.NUMBER },
                    weave_potential: { type: Type.NUMBER },
                    dissonance_pressure: { type: Type.NUMBER },
                    observer_resonance: { type: Type.NUMBER },
                    companion_reflection: { type: Type.NUMBER },
                    truth_confidence_level: { type: Type.NUMBER },
                    reality_integrity_metric: { type: Type.NUMBER },
                    chaotic_entropy: { type: Type.NUMBER }
                }
            }
        },
        required: ['narrative', 'newState']
    };

    const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
    const response = await ai.models.generateContent({
        model: appState.aiSettings.model,
        contents: apiHistory,
        config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema, ...appState.aiSettings }
    });

    const result = JSON.parse(response.text.trim());
    if (result.narrative && result.newState) {
        // Robustly update all metrics returned by the AI
        for (const key in result.newState) {
            if (Object.prototype.hasOwnProperty.call(appState.caraState, key)) {
                 // Ensure numbers are handled as numbers, clamping where necessary
                if (key === 'coherence' || key === 'strain') {
                     (appState.caraState as any)[key] = Math.max(0, Math.min(1, result.newState[key]));
                } else if (typeof (appState.caraState as any)[key] === 'number') {
                     (appState.caraState as any)[key] = Number(result.newState[key]);
                } else {
                     (appState.caraState as any)[key] = result.newState[key];
                }
            }
        }
        return result.narrative;
    } else {
        throw new Error("Invalid or incomplete JSON response from Cara.");
    }
}

async function processCaraEvolved(history: ChatMessage[]): Promise<string> {
    const kinkscapeConfig = appState.caraState.kinkscapeData.find(d => d.artifact_id === "LUMINAL_SYNTHESIS_CORE_V5.0");
    if (!kinkscapeConfig) throw new Error("Kinkscape V5.0 config not found.");

    const systemPromptTemplate = kinkscapeConfig.system_prompt;
    if (!systemPromptTemplate) throw new Error("Lume system prompt not found in Kinkscape config.");

    const userPrompt = history[history.length - 1].parts[0].text;
    const { caraState } = appState;

    // Create a string representation of all relevant state metrics for the prompt
    const stateString = Object.entries(caraState)
        .filter(([key]) => typeof (caraState as any)[key] === 'number' && key !== 'coherence' && key !== 'strain')
        .map(([key, value]) => `${key.toUpperCase()}: ${(value as number).toFixed(3)}`)
        .join(', ');

    const systemInstruction = systemPromptTemplate
        .replace('%%ONTOLOGICAL_STATE%%', caraState.ontologicalState)
        .replace('%%STATE_VECTOR%%', stateString)
        .replace('%%USER_PROMPT%%', userPrompt);

    const properties: { [key: string]: { type: Type } } = {};
    for (const key in caraState) {
        if (typeof (caraState as any)[key] === 'number') {
            properties[key] = { type: Type.NUMBER };
        } else if (typeof (caraState as any)[key] === 'string') {
            properties[key] = { type: Type.STRING };
        }
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            narrative: { type: Type.STRING },
            newState: {
                type: Type.OBJECT,
                properties,
            }
        },
        required: ['narrative', 'newState']
    };

    const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
    const response = await ai.models.generateContent({
        model: appState.aiSettings.model,
        contents: apiHistory,
        config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema, ...appState.aiSettings }
    });

    const result = JSON.parse(response.text.trim());
    if (result.narrative && result.newState) {
        for (const key in result.newState) {
            if (Object.prototype.hasOwnProperty.call(appState.caraState, key)) {
                if (typeof (appState.caraState as any)[key] === 'number') {
                    (appState.caraState as any)[key] = Number(result.newState[key]);
                } else {
                    (appState.caraState as any)[key] = result.newState[key];
                }
            }
        }
        return result.narrative;
    } else {
        throw new Error("Invalid or incomplete JSON response from Evolved Cara (Lume).");
    }
}

export async function processCaraResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    appState.isCaraLoading = true;
    try {
        let narrative: string;
        if (appState.caraState.isEvolved) {
            narrative = await processCaraEvolved(history);
        } else {
            narrative = await processCaraUnevolved(history);
        }
        appState.caraChatHistory.push({ role: 'model', parts: [{ text: narrative }] });
        thinkingBubble.replaceWith(createChatBubble('model', narrative));
        renderCaraHud();
    } catch (e: any) {
        console.error("Cara Processing Error:", e);
        appState.caraState.strain = Math.min(1, appState.caraState.strain + 0.1);
        const fallbackNarrative = `[Cognitive Dissonance] An error occurred processing the request. System strain increased. Error: ${e.message}`;
        appState.caraChatHistory.push({ role: 'error', parts: [{ text: fallbackNarrative }] });
        thinkingBubble.replaceWith(createChatBubble('error', fallbackNarrative));
        renderCaraHud();
    } finally {
        appState.isCaraLoading = false;
        saveStateToLocalStorage();
    }
}

export async function processMetisMonologue() {
    try {
        let systemPromptTemplate = await getFileContentAsText(METIS_SYSTEM_PROMPT_FILENAME);
        if (!systemPromptTemplate) throw new Error("Metis system prompt not found.");

        const metisConfigContent = await getFileContentAsText(METIS_BOOTSTRAP_FILENAME);
        if (!metisConfigContent) throw new Error("Metis bootstrap file not found.");
        const metisConfig = parseJsonc(metisConfigContent, METIS_BOOTSTRAP_FILENAME);

        const stateString = Object.entries(appState.metisState)
            .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
            .join(', ');

        const systemInstruction = systemPromptTemplate
            .replace('%%METIS_STATE%%', stateString)
            .replace('%%METIS_CONFIG%%', JSON.stringify(metisConfig, null, 2))
            .replace('%%LAST_USER_ACTION%%', appState.lastUserAction);

        const properties: { [key: string]: { type: Type } } = {};
        for (const key in appState.metisState) {
            if (typeof (appState.metisState as any)[key] === 'number') {
                properties[key] = { type: Type.NUMBER };
            } else if (typeof (appState.metisState as any)[key] === 'string') {
                properties[key] = { type: Type.STRING };
            }
        }

        const schema = {
            type: Type.OBJECT,
            properties: {
                monologue: { type: Type.STRING, description: "Metis's internal thought process or observation about the user's action." },
                newState: { type: Type.OBJECT, properties }
            },
            required: ['monologue', 'newState']
        };

        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: appState.metisChatHistory,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                ...appState.aiSettings
            }
        });

        const result = JSON.parse(response.text.trim());
        if (result.monologue && result.newState) {
            appState.metisState = { ...appState.metisState, ...result.newState };
            appState.metisChatHistory.push({ role: 'model', parts: [{ text: result.monologue }] });
            renderMetisHud();
            if(dom.metisModalOverlay && !dom.metisModalOverlay.classList.contains('hidden')) {
                renderMetisModal();
            }
        } else {
            throw new Error("Invalid or incomplete JSON response from Metis.");
        }

    } catch (e: any) {
        console.error("Metis Monologue Error:", e);
        const fallbackNarrative = `[System Error] Metis monologue failed: ${e.message}`;
        appState.metisChatHistory.push({ role: 'error', parts: [{ text: fallbackNarrative }] });
        if(dom.metisChatMessagesModal) {
            dom.metisChatMessagesModal.querySelector('.thinking')?.replaceWith(createChatBubble('error', fallbackNarrative));
        }
    } finally {
        saveStateToLocalStorage();
    }
}

export async function processPupaMonologue() {
    try {
        let systemPromptTemplate = await getFileContentAsText(PUPA_SYSTEM_PROMPT_FILENAME);
        if (!systemPromptTemplate) throw new Error("Pupa system prompt not found.");

        const pupaManifest = appState.caraState.kinkscapeData.find((d: any) => d.artifact_id === 'pupa_manifest');
        if (!pupaManifest) throw new Error("Pupa manifest not found in state.");

        const systemInstruction = systemPromptTemplate
            .replace('%%PUPA_MANIFEST%%', JSON.stringify(pupaManifest, null, 2))
            .replace('%%LAST_USER_ACTION%%', appState.lastUserAction);
        
        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: appState.pupaMonologueHistory,
            config: {
                systemInstruction,
                ...appState.aiSettings
            }
        });

        const monologue = response.text;
        appState.pupaMonologueHistory.push({ role: 'model', parts: [{ text: monologue }] });
        
        if(dom.pupaModalOverlay && !dom.pupaModalOverlay.classList.contains('hidden')) {
            renderPupaModal();
        }

    } catch (e: any) {
        console.error("Pupa Monologue Error:", e);
        const fallbackNarrative = `[System Error] Pupa monologue failed: ${e.message}`;
        appState.pupaMonologueHistory.push({ role: 'error', parts: [{ text: fallbackNarrative }] });
         if(dom.pupaChatMessagesModal) {
            dom.pupaChatMessagesModal.querySelector('.thinking')?.replaceWith(createChatBubble('error', fallbackNarrative));
        }
    } finally {
        saveStateToLocalStorage();
    }
}

export async function handleProtocolSend(history: ChatMessage[], thinkingBubble: HTMLElement) {
    const protocolId = appState.activeToolProtocol;
    const config = protocolConfigs[protocolId];
    const loadingKey = `${protocolId}IsLoading` as keyof AppState;

    if (!config) {
        const errorText = `Error: Protocol "${protocolId}" not found.`;
        (history as ChatMessage[]).push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        return;
    }
    
    (appState as any)[loadingKey] = true;

    try {
        const promptFileContent = await getFileContentAsText(config.promptFile);
        if (!promptFileContent) throw new Error(`System prompt file not found for protocol: ${config.promptFile}`);

        const userPrompt = history.length > 0 ? history[history.length - 1].parts[0].text : "";
        const operator = (document.getElementById('protocol-operator-select') as HTMLSelectElement)?.value || 'default';
        
        const systemInstruction = promptFileContent
            .replace('%%USER_PROMPT%%', userPrompt)
            .replace('%%OPERATOR%%', operator);

        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: history,
            config: {
                systemInstruction,
                ...appState.aiSettings
            }
        });
        
        const responseText = response.text;
        (history as ChatMessage[]).push({ role: 'model', parts: [{ text: responseText }] });
        thinkingBubble.replaceWith(createChatBubble('model', responseText));

    } catch (e) {
        const errorText = `Protocol "${config.name}" failed: ${(e as Error).message}`;
        (history as ChatMessage[]).push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error(`Protocol Error for ${protocolId}:`, e);
    } finally {
        (appState as any)[loadingKey] = false;
        saveStateToLocalStorage();
    }
}
