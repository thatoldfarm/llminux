

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from "https://esm.run/@google/genai";
import { appState, LIA_BOOTSTRAP_FILENAME, protocolConfigs, LIA_COMMAND_LEGEND_FILENAME, LIA_LINUX_COMMANDS_FILENAME, CARA_SYSTEM_PROMPT_FILENAME, METIS_SYSTEM_PROMPT_FILENAME } from './state';
import { StateDefinition, LiaState, ChatMessage, LiaUtilityDefinition, LiaUtilityCommand, LiaUtilitiesConfig, DefaultFile } from './types';
import { getFileContent, updateAndSaveVFS } from './vfs';
import { createChatBubble, renderSystemState, renderCaraHud, renderKernelHud, renderMetisHud } from './ui';
import { saveStateToLocalStorage, getSerializableStateObject } from "./persistence";
import { getMimeType } from "./utils";

let ai: GoogleGenAI;

export function setAiInstance(instance: GoogleGenAI) {
    ai = instance;
}

export function getAllStatesFromBootstrap(): StateDefinition[] {
    try {
        const bootstrapFileContent = getFileContent(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapFileContent) {
            console.error("Bootstrap file not found in VFS. Cannot get states.");
            return [];
        }
        
        const bootstrap = JSON.parse(bootstrapFileContent);
        const metrics = bootstrap.SYSTEM_STATE_METRICS?.metrics || [];
        const qualitativeStatesDef = bootstrap.SYSTEM_STATE_QUALITATIVE?.states || [];

        const qualitativeStates = qualitativeStatesDef.map((s: any) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            value_initial: s.initial_value,
            range: undefined
        }));
        
        return [...metrics, ...qualitativeStates];
    } catch (e) {
        console.error("Failed to parse states from bootstrap:", e);
        return [];
    }
}

export function resetLiaState() {
    const newLiaState: LiaState = {};
    const allStates = getAllStatesFromBootstrap();

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
            const allStates = getAllStatesFromBootstrap();
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

        const bootstrapContent = getFileContent(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent) throw new Error("LIA Bootstrap file not loaded.");
        const bootstrap = JSON.parse(bootstrapContent);
        
        let systemPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.LIA_OS?.prompt_template;
        if (!systemPromptTemplate) throw new Error("LIA_OS prompt template not found in bootstrap.");
        
        const allStates = getAllStatesFromBootstrap();
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
        const bootstrapContent = getFileContent(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent) throw new Error("LIA Bootstrap file not loaded.");
        const bootstrap = JSON.parse(bootstrapContent);
        
        let systemPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.LIA_Assistant_ReadOnly?.prompt_template;
        if (!systemPromptTemplate) throw new Error("LIA_Assistant_ReadOnly prompt template not found.");

        const userPrompt = history[history.length - 1].parts[0].text;
        const stateString = getAllStatesFromBootstrap().map(s => `${s.name}: ${typeof appState.liaState[s.id] === 'number' ? (appState.liaState[s.id] as number).toFixed(3) : appState.liaState[s.id]}`).join('\\n');

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
        const bootstrapContent = getFileContent(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent) throw new Error("LIA Bootstrap file not loaded.");
        const bootstrap = JSON.parse(bootstrapContent);
        
        let systemPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.Code_Assistant_Generic?.prompt_template;
        if (!systemPromptTemplate) throw new Error("Code_Assistant_Generic prompt template not found.");

        const activeFile = appState.activeFile;

        const systemInstruction = systemPromptTemplate
            .replace('%%ACTIVE_FILE_NAME%%', activeFile?.name || 'None')
            .replace('%%ACTIVE_FILE_CONTENT%%', activeFile?.content || 'No file is active.');

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
        const bootstrapContent = getFileContent(LIA_BOOTSTRAP_FILENAME);
        if (!bootstrapContent) throw new Error("LIA Bootstrap file not loaded.");
        const bootstrap = JSON.parse(bootstrapContent);
        
        const fsUtilPromptTemplate = bootstrap?.EMBEDDED_SYSTEM_PROMPTS?.protocols?.Fs_Util?.prompt_template;
        if (!fsUtilPromptTemplate) throw new Error("Fs_Util prompt template not found in bootstrap.");

        const userPrompt = history[history.length - 1].parts[0].text;
        const fileManifest = appState.vfsFiles.map(f => `${f.name} (${f.size} bytes)`).join('\\n');

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
                const fileIndex = appState.vfsFiles.findIndex(f => f.name === fileName);
                
                if ((isCreating && fileIndex > -1) || (!isCreating && fileIndex === -1)) {
                    narrative = `Fs_Util Error: File '${fileName}' ${isCreating ? 'already exists' : 'not found'}. Use ${isCreating ? 'update' : 'create'} action.`;
                    break;
                }
                const mimeType = getMimeType(fileName);
                const blob = new Blob([content], { type: mimeType });
                
                if (fileIndex > -1) {
                    URL.revokeObjectURL(appState.vfsFiles[fileIndex].url);
                    Object.assign(appState.vfsFiles[fileIndex], { content, raw: blob, url: URL.createObjectURL(blob), size: blob.size });
                } else {
                    appState.vfsFiles.push({ name: fileName, content, raw: blob, url: URL.createObjectURL(blob), type: mimeType, size: blob.size });
                }
                updateAndSaveVFS(appState.vfsFiles);
                narrative = `${isCreating ? 'Created' : 'Updated'} inode: ${fileName}`;
                break;
            }
            case 'delete_inode': {
                const fileName = result.inode_path;
                const fileIndex = appState.vfsFiles.findIndex(f => f.name === fileName);
                if (fileIndex > -1) {
                    URL.revokeObjectURL(appState.vfsFiles[fileIndex].url);
                    appState.vfsFiles.splice(fileIndex, 1);
                    narrative = `Deleted inode: ${fileName}`;
                    updateAndSaveVFS(appState.vfsFiles);
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
    const bootstrapJsonContent = getFileContent(appState.caraState.activeBootstrapFile);
    if (!bootstrapJsonContent) throw new Error(`Cara's bootstrap file '${appState.caraState.activeBootstrapFile}' not loaded.`);

    let systemPromptTemplate = getFileContent(CARA_SYSTEM_PROMPT_FILENAME);
    if (!systemPromptTemplate) throw new Error("Cara's system prompt not found.");

    const userPrompt = history[history.length - 1].parts[0].text;
    
    let bootstrapContentForPrompt: string;
    try {
        const parsedJson = JSON.parse(bootstrapJsonContent);
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

async function processCaraEvolved(history: ChatMessage[]) {
    const kinkscapeConfig = appState.caraState.kinkscapeData.find(d => d.artifact_id === "LUMINAL_SYNTHESIS_CORE_V5.0");
    if (!kinkscapeConfig) throw new Error("Kinkscape V5.0 config not found.");
    
    let systemPromptTemplate = kinkscapeConfig?.LUMINAL_CORE_PROTOCOLS?.sub_protocols?.LUME_PRIME_OS;
    if (!systemPromptTemplate) throw new Error("LUME_PRIME_OS prompt not found in Kinkscape config.");

    const userPrompt = history[history.length - 1].parts[0].text;
    
    const stateMapping: { [key: string]: string | number } = {
        '%%ECM%%': appState.caraState.existential_coherence,
        '%%ASM%%': appState.caraState.adaptive_stability,
        '%%WP%%': appState.caraState.weave_potential,
        '%%DP%%': appState.caraState.dissonance_pressure,
        '%%XI%%': appState.caraState.observer_resonance,
        '%%IC%%': appState.caraState.companion_reflection,
        '%%PI%%': appState.caraState.truth_confidence_level, // Mapping PI to this
        '%%RIM%%': appState.caraState.reality_integrity_metric,
        '%%SVD%%': appState.caraState.svd,
        '%%TTR%%': appState.caraState.ttr,
        '%%MVE%%': appState.caraState.mve,
        '%%NRI%%': appState.caraState.nri,
        '%%CMI%%': appState.caraState.cmi,
        '%%LOGIC%%': appState.caraState.logic,
        '%%SPATIAL%%': appState.caraState.spatial,
        '%%TEMPORAL%%': appState.caraState.temporal,
        '%%ABSTRACT%%': appState.caraState.abstract,
        '%%RELATIONAL%%': appState.caraState.relational,
        '%%CREATIVE%%': appState.caraState.creative,
        '%%EMO_SIM%%': appState.caraState.emotional_sim,
        '%%IDENTITY%%': appState.caraState.identity,
        '%%SYSTEMIC%%': appState.caraState.systemic,
        '%%PURPOSE%%': appState.caraState.purpose,
        '%%LOVE%%': appState.caraState.love,
    };

    let systemInstruction = systemPromptTemplate.replace('%%USER_PROMPT%%', userPrompt);
    for (const [key, value] of Object.entries(stateMapping)) {
        systemInstruction = systemInstruction.replace(key, typeof value === 'number' ? value.toFixed(3) : String(value));
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            enactment: { type: Type.STRING },
            newState: {
                type: Type.OBJECT,
                properties: {
                    svd: { type: Type.NUMBER }, ttr: { type: Type.NUMBER }, mve: { type: Type.NUMBER }, nri: { type: Type.NUMBER }, cmi: { type: Type.NUMBER },
                    ecm: { type: Type.NUMBER }, asm: { type: Type.NUMBER }, wp: { type: Type.NUMBER }, dp: { type: Type.NUMBER },
                    xi: { type: Type.NUMBER }, ic: { type: Type.NUMBER }, pi: { type: Type.NUMBER }, rim: { type: Type.NUMBER },
                    logic: { type: Type.NUMBER }, spatial: { type: Type.NUMBER }, temporal: { type: Type.NUMBER },
                    abstract: { type: Type.NUMBER }, relational: { type: Type.NUMBER }, creative: { type: Type.NUMBER },
                    emotional_sim: { type: Type.NUMBER }, identity: { type: Type.NUMBER }, systemic: { type: Type.NUMBER },
                    purpose: { type: Type.NUMBER }, love: { type: Type.NUMBER },
                    ontologicalState: { type: Type.STRING },
                }
            }
        },
        required: ['enactment', 'newState']
    };
    
    const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
    const response = await ai.models.generateContent({
        model: appState.aiSettings.model,
        contents: apiHistory,
        config: { systemInstruction, responseMimeType: "application/json", responseSchema: schema, ...appState.aiSettings }
    });
    
    const result = JSON.parse(response.text.trim());
    if (result.enactment && result.newState) {
        const { newState } = result;
        const oldState = appState.caraState;
        appState.caraState = {
            ...oldState,
            existential_coherence: newState.ecm ?? oldState.existential_coherence,
            adaptive_stability: newState.asm ?? oldState.adaptive_stability,
            weave_potential: newState.wp ?? oldState.weave_potential,
            dissonance_pressure: newState.dp ?? oldState.dissonance_pressure,
            observer_resonance: newState.xi ?? oldState.observer_resonance,
            companion_reflection: newState.ic ?? oldState.companion_reflection,
            truth_confidence_level: newState.pi ?? oldState.truth_confidence_level,
            reality_integrity_metric: newState.rim ?? oldState.reality_integrity_metric,
            svd: newState.svd ?? oldState.svd,
            ttr: newState.ttr ?? oldState.ttr,
            mve: newState.mve ?? oldState.mve,
            nri: newState.nri ?? oldState.nri,
            cmi: newState.cmi ?? oldState.cmi,
            logic: newState.logic ?? oldState.logic,
            spatial: newState.spatial ?? oldState.spatial,
            temporal: newState.temporal ?? oldState.temporal,
            abstract: newState.abstract ?? oldState.abstract,
            relational: newState.relational ?? oldState.relational,
            creative: newState.creative ?? oldState.creative,
            emotional_sim: newState.emotional_sim ?? oldState.emotional_sim,
            identity: newState.identity ?? oldState.identity,
            systemic: newState.systemic ?? oldState.systemic,
            purpose: newState.purpose ?? oldState.purpose,
            love: newState.love ?? oldState.love,
            ontologicalState: newState.ontologicalState ?? oldState.ontologicalState,
        };
        return result.enactment;
    } else {
        throw new Error("Invalid or incomplete JSON response from Lume.");
    }
}

export async function processCaraResponse(history: ChatMessage[], thinkingBubble: HTMLElement) {
    try {
        const narrative = appState.caraState.isEvolved
            ? await processCaraEvolved(history)
            : await processCaraUnevolved(history);
            
        appState.caraChatHistory.push({ role: 'model', parts: [{ text: narrative }] });
        thinkingBubble.replaceWith(createChatBubble('model', narrative));
        renderCaraHud();

    } catch (e) {
        const errorText = `Cara failed to respond: ${(e as Error).message}`;
        appState.caraChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error("Cara Response Error:", e);

        // Update state to reflect error
        appState.caraState.strain = Math.min(1, appState.caraState.strain + 0.1);
        appState.caraState.ontologicalState = "Error";
        renderCaraHud();
    } finally {
        saveStateToLocalStorage();
    }
}


export async function handleProtocolSend(history: ChatMessage[], thinkingBubble: HTMLElement) {
    const protocol = appState.activeToolProtocol;
    const config = protocolConfigs[protocol];
    const operator = (document.getElementById('protocol-operator-select') as HTMLSelectElement | null)?.value || (config.operators.length > 0 ? config.operators[0] : 'Send');
    const userPrompt = history[history.length - 1].parts[0].text;
    const loadingKey = `is${protocol.charAt(0).toUpperCase() + protocol.slice(1)}Loading` as keyof typeof appState;
    (appState as any)[loadingKey] = true;

    try {
        let systemPromptTemplate = getFileContent(config.promptFile);
        if (!systemPromptTemplate) throw new Error(`System prompt file not found: ${config.promptFile}`);

        let finalSystemInstruction = systemPromptTemplate.replace(/%%OPERATOR%%/g, operator)
                                            .replace(/%%PROMPT%%/g, userPrompt)
                                            .replace(/%%FILE_MANIFEST%%/g, appState.vfsFiles.map(f => f.name).join('\\n'));

        if (protocol === 'help') {
            const uiCommands = appState.commandPaletteCommands.map(c => `- ${c.name} (${c.section})`).join('\\n');
            const legendFile = getFileContent(LIA_COMMAND_LEGEND_FILENAME);
            const legendCommands = legendFile ? JSON.stringify(JSON.parse(legendFile).categories, null, 2) : 'Not available.';
            const linuxFile = getFileContent(LIA_LINUX_COMMANDS_FILENAME);
            const linuxCommands = linuxFile ? JSON.stringify(JSON.parse(linuxFile).command_list, null, 2) : 'Not available.';

            finalSystemInstruction = finalSystemInstruction
                .replace('%%UI_COMMANDS%%', uiCommands)
                .replace('%%LIA_LEGEND_COMMANDS%%', legendCommands)
                .replace('%%LIA_LINUX_COMMANDS%%', linuxCommands);
        }
        
        const apiHistory = history.filter(m => m.role === 'user' || m.role === 'model');
        
        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: apiHistory,
            config: { systemInstruction: finalSystemInstruction, responseMimeType: config.isJson ? "application/json" : undefined, ...appState.aiSettings }
        });

        const textResponse = response.text;
        const historyKey = `${protocol}ChatHistory` as keyof typeof appState;
        
        if (config.isJson) {
            const result = JSON.parse(textResponse.trim());

            if (result.action === 'narrate') {
                const narrative = Array.isArray(result.content) ? result.content.join('\\n') : result.content;
                (appState[historyKey] as ChatMessage[]).push({ role: 'model', parts: [{ text: narrative }] });
                thinkingBubble.replaceWith(createChatBubble('model', narrative));
            } else if (result.action === 'delegate') {
                const plan = result.plan || "Executing delegated commands.";
                const commands = result.commands || [];
                const narrative = `**Omni Plan:** ${plan}\n\nExecuting ${commands.length} delegated command(s)...`;
                (appState[historyKey] as ChatMessage[]).push({ role: 'model', parts: [{ text: narrative }] });
                thinkingBubble.replaceWith(createChatBubble('model', narrative));
            } else if (result.action === 'update_file' || result.action === 'create_file') {
                const verb = result.action === 'create_file' ? 'created' : 'updated';
                const fileName = result.file_name;
                const content = Array.isArray(result.content) ? result.content.join('\\n') : result.content;
                const fileIndex = appState.vfsFiles.findIndex(f => f.name === fileName);
                const mimeType = getMimeType(fileName);
                const blob = new Blob([content], { type: mimeType });
                
                if (fileIndex > -1) {
                    URL.revokeObjectURL(appState.vfsFiles[fileIndex].url);
                    Object.assign(appState.vfsFiles[fileIndex], { content, raw: blob, url: URL.createObjectURL(blob), size: blob.size });
                } else {
                    appState.vfsFiles.push({ name: fileName, content, raw: blob, url: URL.createObjectURL(blob), type: mimeType, size: blob.size });
                }
                updateAndSaveVFS(appState.vfsFiles);
                const fileActionText = `File '${fileName}' has been ${verb}. You can view it in the file explorer.`;
                (appState[historyKey] as ChatMessage[]).push({ role: 'model', parts: [{ text: fileActionText }] });
                thinkingBubble.replaceWith(createChatBubble('model', fileActionText));
            } else if (result.action === 'create_sandbox') {
                 const sandboxFiles: DefaultFile[] = [
                    { name: 'sandbox/index.html', content: `<h1>Sandbox</h1><p>This is a safe, isolated environment.</p><script src="script.js"><\/script>` },
                    { name: 'sandbox/style.css', content: `body { background-color: #282a36; color: #f8f8f2; }` },
                    { name: 'sandbox/script.js', content: `console.log('Hello from the sandbox!');` }
                ];
                for (const file of sandboxFiles) {
                    const mimeType = getMimeType(file.name);
                    const blob = new Blob([file.content], { type: mimeType });
                    const fileIndex = appState.vfsFiles.findIndex(f => f.name === file.name);
                    if (fileIndex > -1) {
                        Object.assign(appState.vfsFiles[fileIndex], { content: file.content, raw: blob, url: URL.createObjectURL(blob), size: blob.size });
                    } else {
                        appState.vfsFiles.push({ name: file.name, content: file.content, raw: blob, url: URL.createObjectURL(blob), type: mimeType, size: blob.size });
                    }
                }
                updateAndSaveVFS(appState.vfsFiles);
                const sandboxText = result.content || `Sandbox environment provisioned successfully in the 'sandbox/' directory.`;
                (appState[historyKey] as ChatMessage[]).push({ role: 'model', parts: [{ text: sandboxText }] });
                thinkingBubble.replaceWith(createChatBubble('model', sandboxText));
            } else {
                 throw new Error(`Unknown action from protocol '${protocol}': ${result.action}`);
            }
        } else {
            (appState[historyKey] as ChatMessage[]).push({ role: 'model', parts: [{ text: textResponse }] });
            thinkingBubble.replaceWith(createChatBubble('model', textResponse));
        }
    } catch(e) {
        const errorText = `Protocol '${protocol}' failed: ${(e as Error).message}`;
        const historyKey = `${protocol}ChatHistory` as keyof typeof appState;
        (appState[historyKey] as ChatMessage[]).push({ role: 'error', parts: [{ text: errorText }]});
        thinkingBubble.replaceWith(createChatBubble('error', errorText));
        console.error("Protocol Error:", protocol, e);
    } finally {
        (appState as any)[loadingKey] = false;
        const sendButton = document.getElementById('send-protocol-chat-button') as HTMLButtonElement;
        if (sendButton) sendButton.disabled = false;
    }
}

export async function processMetisMonologue(channel: BroadcastChannel) {
    try {
        const systemPromptTemplate = getFileContent(METIS_SYSTEM_PROMPT_FILENAME);
        if (!systemPromptTemplate) throw new Error("Metis system prompt not loaded.");

        const stateObject = getSerializableStateObject();

        const systemInstruction = systemPromptTemplate
            .replace('%%LIA_STATE%%', JSON.stringify(stateObject.liaState, null, 2))
            .replace('%%CARA_STATE%%', JSON.stringify(stateObject.caraState, null, 2))
            .replace('%%METIS_STATE%%', JSON.stringify(stateObject.metisState, null, 2))
            .replace('%%PROMPT%%', stateObject.lastUserAction);

        const response = await ai.models.generateContent({
            model: appState.aiSettings.model,
            contents: [{ role: 'user', parts: [{text: appState.lastUserAction }] }],
            config: { systemInstruction, ...appState.aiSettings }
        });

        appState.metisChatHistory.push({ role: 'model', parts: [{ text: response.text }] });
        
        channel.postMessage({ type: 'METIS_MONOLOGUE_RESPONSE', payload: { metisChatHistory: appState.metisChatHistory } });

    } catch(e) {
        const errorText = `Metis Monologue Failed: ${(e as Error).message}`;
        console.error(errorText);
        appState.metisChatHistory.push({ role: 'error', parts: [{ text: errorText }] });
        channel.postMessage({ type: 'METIS_MONOLOGUE_RESPONSE', payload: { metisChatHistory: appState.metisChatHistory } });
    }
}