import { signal, computed, effect, batch } from '@preact/signals-core';

/**
 * Central state management for Hydra Mini GUI using signals
 */

// Editor state
export const currentCode = signal('');
export const currentEvalCode = signal('');
export const lastEvalRange = signal(null);
export const valuePositions = signal([]);

// GUI state
export const parameters = signal({});
export const settings = signal({});
export const errors = signal([]);
export const layout = signal({
    position: { top: '50px', right: '10px' },
    zIndex: '9999'
});

// Computed values
export const hasErrors = computed(() => errors.value.length > 0);
export const hasParameters = computed(() => valuePositions.value.length > 0);

// Effects for syncing state
effect(() => {
    // When parameters change, update the code through CodeValueManager
    // This will be connected later when we refactor the CodeValueManager
    const params = parameters.value;
    // TODO: Implement parameter -> code sync
});

/**
 * Action creators - these replace the old dispatch actions
 */
export const actions = {
    updateParameter: (name, value) => {
        batch(() => {
            parameters.value = { ...parameters.value, [name]: value };
        });
    },

    updateSettings: (newSettings) => {
        batch(() => {
            settings.value = { ...settings.value, ...newSettings };
        });
    },

    setError: (error) => {
        batch(() => {
            errors.value = [...errors.value, error];
        });
    },

    clearError: (error) => {
        batch(() => {
            errors.value = errors.value.filter(err => err !== error);
        });
    },

    clearErrors: () => {
        batch(() => {
            errors.value = [];
        });
    },

    updateLayout: (newLayout) => {
        batch(() => {
            layout.value = { ...layout.value, ...newLayout };
        });
    },

    // Editor actions
    updateCode: (code, evalRange) => {
        batch(() => {
            currentCode.value = code;
            if (evalRange) {
                lastEvalRange.value = evalRange;
            }
        });
    },

    updateValuePositions: (positions) => {
        batch(() => {
            valuePositions.value = positions;
        });
    }
}; 