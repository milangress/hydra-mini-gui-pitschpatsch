import { signal, computed, effect, Signal } from '@preact/signals-core';
import { Logger } from '../utils/logger';
import { Parser } from 'acorn';
import { ValueMatch } from '../editor/ast/types';
import { CodeFormatter } from '../editor/code-formatter';
import { CodeMirrorRange } from '../editor/types';

/**
 * Central state management for Hydra Mini GUI using signals
 */

interface Settings {
    isReset: boolean;
    showSettings: boolean;
}

interface Layout {
    position: {
        top: string;
        right: string;
    };
    zIndex: string;
}

// Editor state
export const currentCode = signal<string | null>(null);
export const currentEvalCode = signal<string | null>(null);
export const currentEvalRange = signal<CodeMirrorRange | null>(null);
export const currentParameters = signal<ValueMatch[]>([]);

// New parameters
export const parametersMap = signal<Map<number, number | string>>(new Map());
export const parameters = computed(() => {
    const params = currentParameters.value.map(param => ({
        ...param,
        value: parametersMap.value.get(param.index) ?? param.value
    }));
    return params;
});

export const settings = signal<Settings>({
    isReset: false,
    showSettings: false
});
export const errors = signal<string[]>([]);
export const layout = signal<Layout>({
    position: { top: '50px', right: '10px' },
    zIndex: '9999'
});

export const guiReady = signal<boolean>(false);

// Computed values
export const hasErrors = computed(() => errors.value.length > 0);
export const hasParameters = computed(() => currentParameters.value.length > 0);

export const placeholderMessage = computed(() => {
    Logger.log('placeholderMessage computed', currentCode.value, currentParameters.value);

    if (!currentCode.value) {
        return 'Waiting for code...';
    }
    if (!currentParameters.value || currentParameters.value.length === 0) {
        return 'No controls available';
    }
    return null;
});

effect(() => {
    Logger.log('currentEvalRange Signal updated', currentEvalRange.value);
});
effect(() => {
    Logger.log('currentParameters Signal updated', currentParameters.value);
});
effect(() => {
    Logger.log('currentCode Signal updated', currentCode.value);
});
effect(() => {
    Logger.log('parametersMap Signal updated', parametersMap.value);
});
effect(() => {
    Logger.log('settings Signal updated', settings.value);
});
effect(() => {
    Logger.log('errors Signal updated', errors.value);
});

function updateParameterValue(identifier: string | number, value: number | string, type: 'key' | 'index' = 'key'): void {
    Logger.log(`actions.updateParameterValue by ${type}`, { [type]: identifier, value });
    
    if (type === 'key') {
        // Find the parameter with matching key and get its id
        const param = currentParameters.value.find(p => p.key === identifier);
        if (param) {
            identifier = param.index; // Convert key to id
        } else {
            Logger.log('Parameter not found for key:', identifier);
            return;
        }
        if (identifier === undefined) {
            Logger.error('Parameter not found for key:', identifier);
            return;
        }
    }
    
    // Update the map with the id and value
    const newMap = new Map(parametersMap.value);
    newMap.set(identifier as number, value);
    parametersMap.value = newMap;
}

/**
 * Action creators - these replace the old dispatch actions
 */
export const actions = {
    currentParameters: (parameters: ValueMatch[]) => {
        Logger.log('actions.currentParameters', parameters);
        currentParameters.value = parameters;
    },
    updateParameterValueByKey: (key: string, value: number | string) => {
        updateParameterValue(key, value, 'key');
    },
    updateParameterValueByIndex: (index: number, value: number | string) => {
        updateParameterValue(index, value, 'index');
    },
    updateCode: (code: string | null) => currentCode.value = code,
    updateEvalRange: (range: CodeMirrorRange | null) => currentEvalRange.value = range,
    updateSettings: (newSettings: Partial<Settings>) => settings.value = { ...settings.value, ...newSettings },
    setError: (error: string) => errors.value = [error],
    clearErrors: () => errors.value = [],
    resetParameter: (index: number) => {
        const newMap = new Map(parametersMap.value);
        const param = currentParameters.value.find(p => p.index === index);
        if (param) {
            newMap.set(index, param.value);
        }
        parametersMap.value = newMap;
    }
};

export const cmCodeRange = computed(() => {
    if (!currentEvalRange.value || !window.cm) return null;
    const code = window.cm.getRange(currentEvalRange.value.start, currentEvalRange.value.end);
    return code;
});

// Code generation signals
export const codeAst = computed(() => {
    if (!currentCode.value || !currentEvalRange.value || !cmCodeRange.value) return null;
    try {
        return Parser.parse(cmCodeRange.value, { locations: true, ecmaVersion: 'latest' });
    } catch (error) {
        Logger.error('Error parsing code:', error);
        return null;
    }
});

// These signals need the codeFormatter instance to work
// They should be initialized after we have the formatter
let _codeFormatter: CodeFormatter | null = null;
export function initializeCodeSignals(formatter: CodeFormatter): void {
    _codeFormatter = formatter;
}

export const arrowFunctionCode = computed(() => {
    if (!codeAst.value || !_codeFormatter || parametersMap.value.size === 0) return null;
    
    // Create map of all parameters as arrow functions, but only for changed parameters
    const updates = new Map<number, string>();
    for (const [index, _] of parametersMap.value) {
        // Find the parameter info from currentParameters
        const param = currentParameters.value.find(p => p.index === index);
        if (param) {
            updates.set(index, `() => ${param.key}`);
        }
    }
    
    return _codeFormatter.generateCode(codeAst.value, cmCodeRange.value, updates);
});

export const variableAssignments = computed(() => {
    if (parametersMap.value.size === 0) return '';
    
    // Only create assignments for changed parameters
    return Array.from(parametersMap.value.entries())
        .map(([index, value]) => {
            const param = currentParameters.value.find(p => p.index === index);
            if (!param) return null;
            return `${param.key} = ${value}`;
        })
        .filter(Boolean) // Remove null entries
        .join(';\n');
});

export const staticCode = computed(() => {
    if (!codeAst.value || !_codeFormatter || !parameters.value.length) return null;
    
    // Create map using parameters which already has updated values
    const updates = new Map<number, number | string>();
    for (const param of parameters.value) {
        updates.set(param.index, param.value);
    }
    
    return _codeFormatter.generateCode(codeAst.value, cmCodeRange.value, updates);
});

export const codeToEval = computed(() => {
    if (!variableAssignments.value || !arrowFunctionCode.value) return null;
    return `${variableAssignments.value};\n${arrowFunctionCode.value}`;
}); 