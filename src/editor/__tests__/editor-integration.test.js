import { hookIntoEval, hookIntoHydraEditor } from '../editor-integration.js';
import { Logger } from '../../utils/logger.js';
import { mock, expect, test, spyOn, describe, beforeEach, afterEach } from "bun:test";

// Mock the logger to avoid console output during tests
mock.module('../../utils/logger.js', () => ({
    Logger: {
        log: mock(() => {})
    }
}));

describe('Editor Integration', () => {
    let mockWindow;
    let mockCm;
    let context;

    beforeEach(() => {
        // Reset all mocks
        mock.restore();

        // Mock CodeMirror instance
        mockCm = {
            on: mock(() => {}),
            getCursor: mock(() => {}),
            getLine: mock(() => {}),
            lineCount: mock(() => {}),
            getRange: mock(() => {}),
            setOption: mock((option, value) => {
                if (option === 'extraKeys') {
                    mockCm.options.extraKeys = value;  // Just replace, don't merge
                }
            }),
            options: {
                extraKeys: {
                    // Original Hydra key bindings that we need to intercept
                    'Ctrl-Enter': mock(() => {}),
                    'Alt-Enter': mock(() => {}),
                    'Shift-Ctrl-Enter': mock(() => {}),
                    // Other default CodeMirror key bindings
                    'Tab': mock(() => {}),
                    'Shift-Tab': mock(() => {})
                }
            }
        };

        // Mock window
        mockWindow = {
            eval: mock(() => {}),
            cm: mockCm
        };

        // Save original window object
        global.window = mockWindow;

        // Create context object that simulates the class instance
        context = {
            codeManager: {
                isUpdating: false
            },
            lastEvalRange: null,
            currentCode: '',
            currentEvalCode: '',
            updateGUI: mock(() => {}),
            onCodeChange: mock(() => {})
        };
    });

    afterEach(() => {
        // Restore all mocks to their original state
        mock.restore();
    });

    describe('hookIntoEval', () => {
        test('should replace window.eval with interceptor', () => {
            const evalSpy = spyOn(window, 'eval');
            hookIntoEval();

            // Try evaluating some code
            window.eval('test code');

            // Verify logger was called with correct arguments
            expect(Logger.log.mock.calls[0]).toEqual(['hooking into eval']);
            expect(Logger.log.mock.calls[1]).toEqual(['window.eval:', 'test code']);
            
            // Verify original eval was called
            expect(evalSpy).toHaveBeenCalledWith('test code');
        });
    });

    describe('hookIntoHydraEditor', () => {
        test('should wait for editor to be available', async () => {
            // Remove cm temporarily
            delete window.cm;
            
            // Start hooking
            hookIntoHydraEditor.call(context);
            
            // Verify no immediate setup
            expect(mockCm.on.mock.calls).toHaveLength(0);
            
            // Add cm back after some time
            await new Promise(resolve => setTimeout(resolve, 50));
            window.cm = mockCm;
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verify setup occurred
            expect(mockCm.on.mock.calls).toHaveLength(1);
            expect(mockCm.on.mock.calls[0]).toEqual(['change', expect.any(Function)]);
            expect(Logger.log.mock.calls.some(call => call[0] === 'Successfully hooked into Hydra editor')).toBe(true);
        });

        test('should set up change handler correctly', async () => {
            hookIntoHydraEditor.call(context);
            await new Promise(resolve => setTimeout(resolve, 150));

            // Get the change handler
            const changeHandler = mockCm.on.mock.calls[0][1];

            // Test handler ignores changes when codeManager is updating
            context.codeManager.isUpdating = true;
            changeHandler(mockCm, { from: { line: 0 }, to: { line: 0 } });
            expect(context.onCodeChange.mock.calls).toHaveLength(0);

            // Test handler processes changes in eval range
            context.codeManager.isUpdating = false;
            context.lastEvalRange = { start: { line: 0 }, end: { line: 1 } };
            changeHandler(mockCm, { from: { line: 0 }, to: { line: 1 } });
            expect(context.onCodeChange.mock.calls).toHaveLength(1);
        });

        test('should set up key bindings correctly', async () => {
            // Setup mock lines
            mockCm.getLine = mock((line) => {
                const lines = [
                    'osc(10)',
                    '',
                    'noise(20)',
                    '.out()'
                ];
                return lines[line];
            });
            mockCm.lineCount = mock(() => 4);
            mockCm.getCursor = mock(() => ({ line: 2 }));
            mockCm.getRange = mock((start, end) => {
                const lines = [
                    'osc(10)',
                    '',
                    'noise(20)',
                    '.out()'
                ];
                return lines.slice(start.line, end.line).join('\n');
            });

            // Start hooking
            hookIntoHydraEditor.call(context);
            await new Promise(resolve => setTimeout(resolve, 150));

            // Verify the handlers were set up
            expect(mockCm.setOption.mock.calls).toHaveLength(1);
            expect(mockCm.setOption.mock.calls[0][0]).toBe('extraKeys');
            expect(mockCm.options.extraKeys).toBeDefined();
            expect(typeof mockCm.options.extraKeys['Ctrl-Enter']).toBe('function');
            expect(typeof mockCm.options.extraKeys['Alt-Enter']).toBe('function');
            expect(typeof mockCm.options.extraKeys['Shift-Ctrl-Enter']).toBe('function');
            
            // Test each handler
            mockCm.options.extraKeys['Ctrl-Enter']();
            expect(context.lastEvalRange).toEqual({
                start: { line: 2, ch: 0 },
                end: { line: 3, ch: 0 }
            });
            expect(context.updateGUI.mock.calls).toHaveLength(1);

            // Reset the mock calls
            context.updateGUI = mock(() => {});
            mockCm.options.extraKeys['Alt-Enter']();
            expect(context.lastEvalRange).toEqual({
                start: { line: 2, ch: 0 },
                end: { line: 4, ch: 0 }
            });
            expect(context.updateGUI.mock.calls).toHaveLength(1);

            // Reset the mock calls
            context.updateGUI = mock(() => {});
            mockCm.options.extraKeys['Shift-Ctrl-Enter']();
            expect(context.lastEvalRange).toEqual({
                start: { line: 0, ch: 0 },
                end: { line: 4, ch: 0 }
            });
            expect(context.updateGUI.mock.calls).toHaveLength(1);
        });

        test('getCurrentBlock should find correct block boundaries', async () => {
            // Setup mock lines
            mockCm.getLine = mock((line) => {
                const lines = [
                    'osc(10)',
                    '.color(1)',
                    '.out()',
                    '',
                    'noise(20)',
                    '.out()'
                ];
                return lines[line];
            });
            mockCm.lineCount = mock(() => 6);
            mockCm.getCursor = mock(() => ({ line: 1 }));
            mockCm.getRange = mock((start, end) => {
                const lines = [
                    'osc(10)',
                    '.color(1)',
                    '.out()',
                    '',
                    'noise(20)',
                    '.out()'
                ];
                return lines.slice(start.line, end.line).join('\n');
            });

            // Start hooking
            hookIntoHydraEditor.call(context);
            await new Promise(resolve => setTimeout(resolve, 150));

            // Test block selection
            mockCm.options.extraKeys['Alt-Enter']();
            expect(context.lastEvalRange).toEqual({
                start: { line: 0, ch: 0 },
                end: { line: 3, ch: 0 }
            });

            // Move cursor to second block
            mockCm.getCursor = mock(() => ({ line: 4 }));
            mockCm.options.extraKeys['Alt-Enter']();
            expect(context.lastEvalRange).toEqual({
                start: { line: 4, ch: 0 },
                end: { line: 6, ch: 0 }
            });
        });

        test('should handle empty lines correctly', async () => {
            // Setup mock lines with multiple empty lines
            mockCm.getLine = mock((line) => {
                const lines = [
                    '',
                    'osc(10)',
                    '.out()',
                    '',
                    '',
                    'noise(20)'
                ];
                return lines[line];
            });
            mockCm.lineCount = mock(() => 6);
            mockCm.getCursor = mock(() => ({ line: 1 }));
            mockCm.getRange = mock((start, end) => {
                const lines = [
                    '',
                    'osc(10)',
                    '.out()',
                    '',
                    '',
                    'noise(20)'
                ];
                return lines.slice(start.line, end.line).join('\n');
            });

            // Start hooking
            hookIntoHydraEditor.call(context);
            await new Promise(resolve => setTimeout(resolve, 150));

            // Test block selection with empty lines
            mockCm.options.extraKeys['Alt-Enter']();
            expect(context.lastEvalRange).toEqual({
                start: { line: 1, ch: 0 },
                end: { line: 3, ch: 0 }
            });
        });
    });
}); 