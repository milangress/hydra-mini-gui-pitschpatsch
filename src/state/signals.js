import { signal, computed, effect } from '@preact/signals-core';
import { Logger } from '../utils/logger.js';
import { Parser } from '../utils/parser.js';
import { codeFormatter } from '../utils/codeFormatter.js';

/**
 * Central state management for Hydra Mini GUI using signals
 */

// Editor state
export const currentCode = signal(null);
export const currentEvalCode = signal(null);
export const currentEvalRange = signal(null);
export const currentParameters = signal([]);

// GUI state
export const parametersMap = signal(new Map());
export const settings = signal({
    isReset: false,
    showSettings: false
});
export const errors = signal([]);
export const layout = signal({
    position: { top: '50px', right: '10px' },
    zIndex: '9999'
});

export const guiReady = signal(false);

// Computed values
export const hasErrors = computed(() => errors.value.length > 0);
export const hasParameters = computed(() => currentParameters.value.length > 0);

export const parameters = computed(() => {
    const params = currentParameters.value.map(param => ({
        ...param,
        value: parametersMap.value.get(param.index) ?? param.value
    }));
    console.log('parameters computed', params);
    return params;
});

export const placeholderMessage = computed(() => {
    console.log('placeholderMessage computed', currentCode.value, currentParameters.value);

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

function updateParameterValue(identifier, value, type = 'key') {
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
    newMap.set(identifier, value);
    parametersMap.value = newMap;
}

/**
 * Action creators - these replace the old dispatch actions
 */
export const actions = {
    currentParameters: (parameters) => {
        console.log('actions.currentParameters', parameters);
        currentParameters.value = parameters;
    },
    updateParameterValueByKey: (key, value) => {
        updateParameterValue(key, value, 'key');
    },
    updateParameterValueByIndex: (index, value) => {
        updateParameterValue(index, value, 'index');
    },
    updateCode: (code) => currentCode.value = code,
    updateEvalRange: (range) => currentEvalRange.value = range,
    updateSettings: (newSettings) => settings.value = { ...settings.value, ...newSettings },
    setError: (error) => errors.value = [error],
    clearErrors: () => errors.value = [],
};

// Code generation signals
export const codeAst = computed(() => {
  if (!currentCode.value || !currentEvalRange.value) return null;
  const code = window.cm.getRange(currentEvalRange.value.start, currentEvalRange.value.end);
  return Parser.parse(code, { locations: true, ecmaVersion: 'latest' });
});

export const arrowFunctionCode = computed(() => {
  if (!codeAst.value || !parameters.value.length) return null;
  const code = window.cm.getRange(currentEvalRange.value.start, currentEvalRange.value.end);
  
  // Create map of all parameters as arrow functions
  const updates = new Map();
  for (const param of parameters.value) {
    updates.set(param.index, `() => ${param.key}`);
  }
  
  return codeFormatter.generateCode(codeAst.value, code, updates);
});

export const variableAssignments = computed(() => {
  if (!parameters.value.length) return '';
  // Use parameters.value since it already has the updated values
  return parameters.value
    .map(param => `${param.key} = ${param.value}`)
    .join(';\n');
});

export const staticCode = computed(() => {
  if (!codeAst.value) return null;
  const code = window.cm.getRange(currentEvalRange.value.start, currentEvalRange.value.end);
  
  // Create map using parameters which already has updated values
  const updates = new Map();
  for (const param of parameters.value) {
    updates.set(param.index, param.value);
  }
  
  return codeFormatter.generateCode(codeAst.value, code, updates);
});

export const hasCodeEvaled = signal(false);

export const codeToEval = computed(() => {
  if (!hasCodeEvaled.value && arrowFunctionCode.value) {
    return `${variableAssignments.value};\n${arrowFunctionCode.value}`;
  }
  return `${variableAssignments.value}`;
}); 