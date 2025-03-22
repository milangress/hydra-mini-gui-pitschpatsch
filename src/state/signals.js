import { signal, computed, effect } from '@preact/signals-core';
import { Logger } from '../utils/logger.js';
import { Parser } from 'acorn';


/**
 * Central state management for Hydra Mini GUI using signals
 */

// Editor state
export const currentCode = signal(null);
export const currentEvalCode = signal(null);
export const currentEvalRange = signal(null);
export const currentParameters = signal([]);


// New parameters
export const parametersMap = signal(new Map());
export const parameters = computed(() => {
    const params = currentParameters.value.map(param => ({
        ...param,
        value: parametersMap.value.get(param.index) ?? param.value
    }));
    return params;
});


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
        Logger.log('actions.currentParameters', parameters);
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

export const cmCodeRange = computed(() => {
    if (!currentEvalRange.value) return null;
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
let _codeFormatter = null;
export function initializeCodeSignals(formatter) {
  _codeFormatter = formatter;
}

export const arrowFunctionCode = computed(() => {
  if (!codeAst.value || !_codeFormatter || parametersMap.value.size === 0) return null;
  
  // Create map of all parameters as arrow functions, but only for changed parameters
  const updates = new Map();
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
  const updates = new Map();
  for (const param of parameters.value) {
    updates.set(param.index, param.value);
  }
  
  return _codeFormatter.generateCode(codeAst.value, cmCodeRange.value, updates);
});


export const codeToEval = computed(() => {
    return `${variableAssignments.value};\n${arrowFunctionCode.value}`;
});