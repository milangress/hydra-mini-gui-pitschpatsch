import { signal, computed, effect } from '@preact/signals-core';
import { Logger } from '../utils/logger.js';

/**
 * Central state management for Hydra Mini GUI using signals
 */

// Editor state
export const currentCode = signal('');
export const currentEvalCode = signal('');
export const currentEvalRange = signal(null);
export const currentParameters = signal([]);

export const valuePositions = signal([]);

// GUI state
export const parameters = signal(new Map());
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
export const hasParameters = computed(() => valuePositions.value.length > 0);

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
    Logger.log('valuePositions Signal updated', valuePositions.value);
});
effect(() => {
    Logger.log('parameters Signal updated', parameters.value);
});
effect(() => {
    Logger.log('settings Signal updated', settings.value);
});

/**
 * Action creators - these replace the old dispatch actions
 */
export const actions = {
    evalResult: ({result, code, range, parameters}) => {
        currentEvalResult.value = result;
        currentEvalCode.value = code;
        currentEvalRange.value = range;
        currentParameters.value = parameters;
    },
    currentParameters: () => currentParameters.value,
    updateCode: (code) => currentCode.value = code,
    updateParameter: (key, value) => {
        Logger.log('actions.updateParameter', { key, value });
        const newParams = new Map(parameters.value);
        newParams.set(key, value);
        parameters.value = newParams;
    },
    updateEvalRange: (range) => currentEvalRange.value = range,
    updateSettings: (newSettings) => settings.value = { ...settings.value, ...newSettings },
    setError: (error) => errors.value = [error],
    clearErrors: () => errors.value = [],
}; 