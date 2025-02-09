import { GUIManager } from '../gui-manager.js';
import { DOMAdapter } from '../../adapters/dom-adapter.js';
import { ParameterManager } from '../../parameter-manager.js';
import { SettingsPage } from '../../settings-page.js';
import { Logger } from '../../../utils/logger.js';

// Mock dependencies
jest.mock('tweakpane');
jest.mock('../../adapters/dom-adapter');
jest.mock('../../parameter-manager');
jest.mock('../../settings-page');
jest.mock('../../../utils/logger');

describe('GUIManager', () => {
    let manager;
    let mockHydra;
    let mockDOMAdapter;
    let mockParameterManager;
    let mockSettingsPage;
    let mockPane;
    let mockTab;
    
    beforeEach(() => {
        // Setup mocks
        mockHydra = {};
        mockDOMAdapter = new DOMAdapter();
        mockParameterManager = new ParameterManager();
        mockSettingsPage = new SettingsPage();
        
        mockTab = {
            pages: [
                { title: 'Parameters' },
                { title: 'Settings' }
            ]
        };
        
        mockPane = {
            addTab: jest.fn(() => mockTab),
            dispose: jest.fn()
        };
        
        // Setup manager
        manager = new GUIManager(mockHydra);
        manager.gui = mockPane;
    });
    
    afterEach(() => {
        jest.clearAllMocks();
    });
    
    describe('constructor', () => {
        test('initializes with correct state and dependencies', () => {
            expect(manager.state).toBeDefined();
            expect(manager.domAdapter).toBeInstanceOf(DOMAdapter);
            expect(manager.parameterManager).toBeInstanceOf(ParameterManager);
            expect(manager.settingsPage).toBeInstanceOf(SettingsPage);
        });
    });
    
    describe('dispatch', () => {
        test('updates state based on action', () => {
            const action = {
                type: 'UPDATE_PARAMETER',
                payload: { name: 'frequency', value: 440 }
            };
            
            const nextState = manager.dispatch(action);
            
            expect(nextState.parameters).toEqual({
                frequency: 440
            });
        });
    });
    
    describe('setupGUI', () => {
        beforeEach(() => {
            mockDOMAdapter.setupContainer.mockReturnValue(document.createElement('div'));
        });
        
        test('sets up GUI with container and tabs', () => {
            const gui = manager.setupGUI();
            
            expect(Logger.log).toHaveBeenCalledWith('setting up gui');
            expect(mockDOMAdapter.setupContainer).toHaveBeenCalled();
            expect(gui).toBeDefined();
            expect(mockPane.addTab).toHaveBeenCalled();
        });
        
        test('cleans up existing GUI before setup', () => {
            manager.setupGUI();
            
            expect(mockPane.dispose).toHaveBeenCalled();
        });
        
        test('returns early if container setup fails', () => {
            mockDOMAdapter.setupContainer.mockReturnValue(null);
            
            const gui = manager.setupGUI();
            
            expect(gui).toBeUndefined();
        });
    });
    
    describe('updateGUI', () => {
        const mockCode = 'osc(60)';
        const mockValues = [{ name: 'frequency', value: 60 }];
        const mockCallback = jest.fn();
        
        beforeEach(() => {
            manager.parametersTab = {
                children: [{ dispose: jest.fn() }]
            };
        });
        
        test('updates parameters and settings', () => {
            manager.updateGUI(mockCode, mockValues, mockCallback);
            
            expect(mockParameterManager.updateParameters).toHaveBeenCalledWith(
                manager.parametersTab,
                mockCode,
                mockValues,
                expect.any(Function)
            );
            
            expect(mockSettingsPage.updateCode).toHaveBeenCalledWith(mockCode);
            expect(mockSettingsPage.updateDefaults).toHaveBeenCalledWith(mockValues);
        });
        
        test('handles errors during update', () => {
            const error = new Error('Test error');
            mockParameterManager.updateParameters.mockImplementation(() => {
                throw error;
            });
            
            manager.updateGUI(mockCode, mockValues, mockCallback);
            
            expect(mockSettingsPage.showError).toHaveBeenCalledWith(error.message);
        });
        
        test('adds placeholder for empty values', () => {
            manager.updateGUI(mockCode, [], mockCallback);
            
            // Verify placeholder is added
            expect(manager.parametersTab.addBinding).toHaveBeenCalled();
        });
    });
    
    describe('cleanup', () => {
        test('cleans up all resources', () => {
            manager.cleanup();
            
            expect(mockPane.dispose).toHaveBeenCalled();
            expect(mockSettingsPage.cleanup).toHaveBeenCalled();
            expect(mockParameterManager.cleanup).toHaveBeenCalled();
            expect(mockDOMAdapter.cleanup).toHaveBeenCalled();
            
            expect(manager.gui).toBeNull();
            expect(manager.tabs).toBeNull();
            expect(manager.parametersTab).toBeNull();
        });
    });
    
    describe('updateControlValue', () => {
        test('updates control value and dispatches action', () => {
            const name = 'frequency';
            const value = 440;
            
            manager.updateControlValue(name, value);
            
            expect(mockParameterManager.updateControlValue).toHaveBeenCalledWith(name, value);
            expect(manager.state.parameters[name]).toBe(value);
        });
    });
}); 