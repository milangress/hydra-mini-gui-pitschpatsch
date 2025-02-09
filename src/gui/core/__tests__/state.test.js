import { createInitialState, reducer, actions } from '../state.js';

describe('GUI State Management', () => {
    let initialState;
    
    beforeEach(() => {
        initialState = createInitialState();
    });
    
    test('creates initial state with correct structure', () => {
        expect(initialState).toEqual({
            parameters: {},
            settings: {},
            errors: [],
            layout: {
                position: { top: '50px', right: '10px' },
                zIndex: '9999'
            }
        });
    });
    
    describe('reducer', () => {
        test('handles UPDATE_PARAMETER action', () => {
            const action = actions.updateParameter('frequency', 440);
            const nextState = reducer(initialState, action);
            
            expect(nextState.parameters).toEqual({
                frequency: 440
            });
        });
        
        test('handles UPDATE_SETTINGS action', () => {
            const action = actions.updateSettings({ theme: 'dark' });
            const nextState = reducer(initialState, action);
            
            expect(nextState.settings).toEqual({
                theme: 'dark'
            });
        });
        
        test('handles SET_ERROR action', () => {
            const action = actions.setError('Test error');
            const nextState = reducer(initialState, action);
            
            expect(nextState.errors).toEqual(['Test error']);
        });
        
        test('handles CLEAR_ERROR action', () => {
            const state = {
                ...initialState,
                errors: ['Error 1', 'Error 2']
            };
            
            const action = actions.clearError('Error 1');
            const nextState = reducer(state, action);
            
            expect(nextState.errors).toEqual(['Error 2']);
        });
        
        test('handles UPDATE_LAYOUT action', () => {
            const action = actions.updateLayout({
                position: { top: '100px' }
            });
            const nextState = reducer(initialState, action);
            
            expect(nextState.layout).toEqual({
                position: { 
                    top: '100px',
                    right: '10px'
                },
                zIndex: '9999'
            });
        });
        
        test('returns current state for unknown action', () => {
            const action = { type: 'UNKNOWN' };
            const nextState = reducer(initialState, action);
            
            expect(nextState).toBe(initialState);
        });
    });
    
    describe('action creators', () => {
        test('creates UPDATE_PARAMETER action', () => {
            const action = actions.updateParameter('frequency', 440);
            expect(action).toEqual({
                type: 'UPDATE_PARAMETER',
                payload: { name: 'frequency', value: 440 }
            });
        });
        
        test('creates UPDATE_SETTINGS action', () => {
            const action = actions.updateSettings({ theme: 'dark' });
            expect(action).toEqual({
                type: 'UPDATE_SETTINGS',
                payload: { theme: 'dark' }
            });
        });
        
        test('creates SET_ERROR action', () => {
            const action = actions.setError('Test error');
            expect(action).toEqual({
                type: 'SET_ERROR',
                payload: 'Test error'
            });
        });
        
        test('creates CLEAR_ERROR action', () => {
            const action = actions.clearError('Test error');
            expect(action).toEqual({
                type: 'CLEAR_ERROR',
                payload: 'Test error'
            });
        });
        
        test('creates UPDATE_LAYOUT action', () => {
            const action = actions.updateLayout({ position: { top: '100px' } });
            expect(action).toEqual({
                type: 'UPDATE_LAYOUT',
                payload: { position: { top: '100px' } }
            });
        });
    });
}); 