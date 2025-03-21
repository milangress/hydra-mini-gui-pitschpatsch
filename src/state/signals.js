import { signal, computed, batch } from '@preact/signals-core';
import { Logger } from '../utils/logger.js';

/**
 * Central state management for Hydra Mini GUI using signals
 */

// Editor state
export const currentCode = signal('');
export const currentEvalCode = signal('');
export const lastEvalRange = signal(null);
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

// Computed values
export const hasErrors = computed(() => errors.value.length > 0);
export const hasParameters = computed(() => valuePositions.value.length > 0);

/**
 * Action creators - these replace the old dispatch actions
 */
export const actions = {
    updateCode: (code) => currentCode.value = code,
    updateEvalCode: (code) => currentEvalCode.value = code,
    updateEvalRange: (range) => lastEvalRange.value = range,
    updateValuePositions: (positions) => valuePositions.value = positions,
    updateParameter: (key, value) => {
        Logger.log('actions.updateParameter', { key, value });
        const newParams = new Map(parameters.value);
        newParams.set(key, value);
        parameters.value = newParams;
    },
    updateSettings: (newSettings) => settings.value = { ...settings.value, ...newSettings },
    setError: (error) => errors.value = [error],
    clearErrors: () => errors.value = [],
    updateLayout: (newLayout) => {
        batch(() => {
            layout.value = { ...layout.value, ...newLayout };
        });
    }
}; 