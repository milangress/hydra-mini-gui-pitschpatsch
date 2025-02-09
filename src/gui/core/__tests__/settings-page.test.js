import { SettingsPage } from '../settings-page.js';
import { Logger } from '../../../utils/logger.js';

describe('SettingsPage', () => {
    let page;
    let mockHydra;
    let mockTweakpaneAdapter;
    let mockPage;
    let mockFolder;
    
    beforeEach(() => {
        // Mock Hydra
        mockHydra = {
            synth: {
                stats: { fps: 60 },
                time: 0,
                hush: jest.fn()
            }
        };
        
        // Mock folder
        mockFolder = {
            hidden: false
        };
        
        // Mock Tweakpane adapter
        mockTweakpaneAdapter = {
            createFolder: jest.fn(() => mockFolder),
            createBinding: jest.fn(),
            createReadOnlyBinding: jest.fn(),
            createButton: jest.fn(),
            createMessageBinding: jest.fn(),
            createErrorBinding: jest.fn(),
            createCodeBinding: jest.fn(),
            clearFolder: jest.fn()
        };
        
        // Mock page
        mockPage = {};
        
        // Create settings page
        page = new SettingsPage(mockHydra, mockTweakpaneAdapter);
    });
    
    describe('setup', () => {
        beforeEach(() => {
            page.setup(mockPage);
        });
        
        test('creates all folders', () => {
            expect(mockTweakpaneAdapter.createFolder).toHaveBeenCalledWith(mockPage, {
                title: 'Controls',
                expanded: true
            });
            expect(mockTweakpaneAdapter.createFolder).toHaveBeenCalledWith(mockPage, {
                title: 'Statistics',
                expanded: true
            });
            expect(mockTweakpaneAdapter.createFolder).toHaveBeenCalledWith(mockPage, {
                title: 'Defaults',
                expanded: false
            });
            expect(mockTweakpaneAdapter.createFolder).toHaveBeenCalledWith(mockPage, {
                title: 'Current Code',
                expanded: false
            });
            expect(mockTweakpaneAdapter.createFolder).toHaveBeenCalledWith(mockPage, {
                title: 'Errors',
                expanded: false
            });
        });
        
        test('sets up controls', () => {
            expect(mockTweakpaneAdapter.createBinding).toHaveBeenCalledWith(
                mockFolder,
                Logger,
                'isEnabled',
                expect.any(Object)
            );
            
            expect(mockTweakpaneAdapter.createButton).toHaveBeenCalledWith(
                mockFolder,
                expect.objectContaining({
                    title: 'Reset All Values'
                })
            );
            
            expect(mockTweakpaneAdapter.createButton).toHaveBeenCalledWith(
                mockFolder,
                expect.objectContaining({
                    title: 'Hush'
                })
            );
        });
        
        test('sets up statistics', () => {
            expect(mockTweakpaneAdapter.createBinding).toHaveBeenCalledWith(
                mockFolder,
                mockHydra.synth.stats,
                'fps',
                expect.objectContaining({
                    view: 'graph',
                    min: 0,
                    max: 180,
                    readonly: true
                })
            );
            
            expect(mockTweakpaneAdapter.createReadOnlyBinding).toHaveBeenCalledWith(
                mockFolder,
                mockHydra.synth,
                'time',
                expect.any(Object)
            );
        });
    });
    
    describe('updateDefaults', () => {
        beforeEach(() => {
            page.setup(mockPage);
            page.folders.defaults = mockFolder;
        });
        
        test('updates defaults display', () => {
            const valuePositions = [
                {
                    functionName: 'osc',
                    lineNumber: 1,
                    functionStartCh: 0,
                    paramType: 'float',
                    paramDefault: 1,
                    value: 2,
                    paramName: 'freq',
                    index: 0,
                    parameterIndex: 0
                }
            ];
            
            page.updateDefaults(valuePositions);
            
            expect(mockTweakpaneAdapter.clearFolder).toHaveBeenCalledWith(mockFolder);
            expect(mockTweakpaneAdapter.createFolder).toHaveBeenCalledWith(
                mockFolder,
                expect.objectContaining({
                    title: 'osc'
                })
            );
            expect(mockTweakpaneAdapter.createButton).toHaveBeenCalled();
        });
        
        test('shows read-only binding for default values', () => {
            const valuePositions = [
                {
                    functionName: 'osc',
                    lineNumber: 1,
                    functionStartCh: 0,
                    paramType: 'float',
                    paramDefault: 1,
                    value: 1,
                    paramName: 'freq',
                    index: 0,
                    parameterIndex: 0
                }
            ];
            
            page.updateDefaults(valuePositions);
            
            expect(mockTweakpaneAdapter.createReadOnlyBinding).toHaveBeenCalled();
            expect(mockTweakpaneAdapter.createButton).not.toHaveBeenCalled();
        });
    });
    
    describe('updateCode', () => {
        beforeEach(() => {
            page.setup(mockPage);
            page.folders.codeMonitor = mockFolder;
        });
        
        test('updates code display', () => {
            const code = 'osc(60)';
            page.updateCode(code);
            
            expect(mockTweakpaneAdapter.clearFolder).toHaveBeenCalledWith(mockFolder);
            expect(mockTweakpaneAdapter.createCodeBinding).toHaveBeenCalledWith(
                mockFolder,
                code
            );
        });
        
        test('handles empty code', () => {
            page.updateCode('');
            
            expect(mockTweakpaneAdapter.createCodeBinding).toHaveBeenCalledWith(
                mockFolder,
                'No code'
            );
        });
    });
    
    describe('error handling', () => {
        beforeEach(() => {
            page.setup(mockPage);
            page.folders.errors = mockFolder;
        });
        
        test('shows error message', () => {
            const error = 'Test error';
            page.showError(error);
            
            expect(mockFolder.hidden).toBe(false);
            expect(mockTweakpaneAdapter.clearFolder).toHaveBeenCalledWith(mockFolder);
            expect(mockTweakpaneAdapter.createErrorBinding).toHaveBeenCalledWith(
                mockFolder,
                error
            );
        });
        
        test('hides error message', () => {
            page.hideError();
            expect(mockFolder.hidden).toBe(true);
        });
    });
    
    describe('callbacks', () => {
        test('sets and calls reset callback', () => {
            const callback = jest.fn();
            page.setResetCallback(callback);
            
            page.setup(mockPage);
            const resetButton = mockTweakpaneAdapter.createButton.mock.calls.find(
                call => call[1].title === 'Reset All Values'
            );
            resetButton[1].onClick();
            
            expect(callback).toHaveBeenCalled();
        });
        
        test('sets and calls default callback', () => {
            const callback = jest.fn();
            page.setDefaultCallback(callback);
            
            const index = 0;
            const defaultValue = 1;
            page.callbacks.onSetDefault(index, defaultValue);
            
            expect(callback).toHaveBeenCalledWith(index, defaultValue);
        });
    });
    
    describe('cleanup', () => {
        test('resets all properties', () => {
            page.setup(mockPage);
            page.cleanup();
            
            expect(page.page).toBeNull();
            expect(page.folders.controls).toBeNull();
            expect(page.folders.stats).toBeNull();
            expect(page.folders.defaults).toBeNull();
            expect(page.folders.codeMonitor).toBeNull();
            expect(page.folders.errors).toBeNull();
            expect(page.currentCode).toBe('');
            expect(page.callbacks.onReset).toBeNull();
            expect(page.callbacks.onSetDefault).toBeNull();
        });
    });
}); 