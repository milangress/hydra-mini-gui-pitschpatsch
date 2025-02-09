import { ActionTypes } from './types.js';

/**
 * Creates initial GUI state
 * @returns {import('./types.js').GUIState}
 */
export function createInitialState() {
    return {
        parameters: {},
        settings: {},
        errors: [],
        layout: {
            position: { top: '50px', right: '10px' },
            zIndex: '9999'
        }
    };
}

/**
 * Pure function to update state based on action
 * @param {import('./types.js').GUIState} state 
 * @param {import('./types.js').GUIAction} action 
 * @returns {import('./types.js').GUIState}
 */
export function reducer(state, action) {
    switch (action.type) {
        case ActionTypes.UPDATE_PARAMETER:
            return {
                ...state,
                parameters: {
                    ...state.parameters,
                    [action.payload.name]: action.payload.value
                }
            };
            
        case ActionTypes.UPDATE_SETTINGS:
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.payload
                }
            };
            
        case ActionTypes.SET_ERROR:
            return {
                ...state,
                errors: [...state.errors, action.payload]
            };
            
        case ActionTypes.CLEAR_ERROR:
            return {
                ...state,
                errors: state.errors.filter(err => err !== action.payload)
            };
            
        case ActionTypes.UPDATE_LAYOUT:
            return {
                ...state,
                layout: {
                    ...state.layout,
                    ...action.payload
                }
            };
            
        default:
            return state;
    }
}

/**
 * Creates actions
 */
export const actions = {
    updateParameter: (name, value) => ({
        type: ActionTypes.UPDATE_PARAMETER,
        payload: { name, value }
    }),
    
    updateSettings: (settings) => ({
        type: ActionTypes.UPDATE_SETTINGS,
        payload: settings
    }),
    
    setError: (error) => ({
        type: ActionTypes.SET_ERROR,
        payload: error
    }),
    
    clearError: (error) => ({
        type: ActionTypes.CLEAR_ERROR,
        payload: error
    }),
    
    updateLayout: (layout) => ({
        type: ActionTypes.UPDATE_LAYOUT,
        payload: layout
    })
}; 