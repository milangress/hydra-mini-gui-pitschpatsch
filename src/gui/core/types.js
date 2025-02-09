/**
 * @typedef {Object} GUIState
 * @property {Object} parameters - The current parameter values
 * @property {Object} settings - The current settings values
 * @property {string[]} errors - Any current error messages
 * @property {Object} layout - Layout configuration
 */

/**
 * @typedef {Object} GUIConfig
 * @property {string} title - The GUI title
 * @property {Object} style - Style configuration
 * @property {Function} onValueChange - Callback for value changes
 */

/**
 * @typedef {Object} GUIAction
 * @property {string} type - The action type
 * @property {any} payload - The action payload
 */

export const ActionTypes = {
    UPDATE_PARAMETER: 'UPDATE_PARAMETER',
    UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    SET_ERROR: 'SET_ERROR',
    CLEAR_ERROR: 'CLEAR_ERROR',
    UPDATE_LAYOUT: 'UPDATE_LAYOUT'
}; 