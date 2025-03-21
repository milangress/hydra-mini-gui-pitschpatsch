// Editor integration methods
import { Logger } from '../utils/logger.js';
import { actions, currentEvalRange } from '../state/signals.js';

export const hookIntoEval = () => {
    Logger.log('hooking into eval');
    // Store the original window.eval
    const originalEval = window.eval;
    
    // Replace window.eval with our interceptor
    window.eval = (code) => {
        // Log the code being evaluated
        Logger.log('window.eval:', code);
        
        // Call the original eval with the code
        return originalEval.call(window, code);
    };
};

export const hookIntoHydraEditor = function() {
    Logger.log('hooking into hydra editor');
    const waitForEditor = setInterval(() => {
        if (window.cm) {
            clearInterval(waitForEditor);
            Logger.log('got editor');

            // Get the CodeMirror instance
            const cm = window.cm;

            // Add change event listener
            cm.on('change', (cm, change) => {
                // Skip if this change is from our own updates
                if (this.codeManager?.isUpdating) return;
                
                // Only update if we have a last eval range
                if (currentEvalRange.value) {
                    // Check if the change is within our last eval range
                    const changeInRange = (
                        change.from.line >= currentEvalRange.value.start.line &&
                        change.to.line <= currentEvalRange.value.end.line
                    );
                    
                    if (changeInRange) {
                        // Get current code and find values
                        const code = cm.getRange(currentEvalRange.value.start, currentEvalRange.value.end);
                        actions.updateCode(code);
                        this.codeManager.findValues(code);
                    }
                }
            });

            // Add getCurrentBlock function
            const getCurrentBlock = () => {
                const pos = cm.getCursor();
                let startline = pos.line;
                let endline = pos.line;

                // Search backwards for the start of the block (empty line or start of document)
                while (startline > 0) {
                    const line = cm.getLine(startline - 1);
                    if (line === undefined || line.trim() === '') {
                        break;
                    }
                    startline--;
                }

                // Search forwards for the end of the block (empty line or end of document)
                while (endline < cm.lineCount() - 1) {
                    const line = cm.getLine(endline + 1);
                    if (line === undefined || line.trim() === '') {
                        break;
                    }
                    endline++;
                }

                // Include the current line
                endline++;

                const pos1 = { line: startline, ch: 0 };
                const pos2 = { line: endline, ch: 0 };
                const str = cm.getRange(pos1, pos2);

                Logger.log('Found block:', {
                    start: pos1,
                    end: pos2,
                    text: str
                });

                return {
                    start: pos1,
                    end: pos2,
                    text: str
                };
            };

            // These are the key combinations that can trigger code evaluation
            const evalKeys = {
                'Ctrl-Enter': 'editor: eval line',
                'Alt-Enter': 'editor: eval block',
                'Shift-Ctrl-Enter': 'editor: eval all'
            };

            // Hook into CodeMirror's key handler to track positions
            const originalExtraKeys = cm.options.extraKeys || {};
            Object.entries(evalKeys).forEach(([key, action]) => {
                if (originalExtraKeys[key]) {
                    const originalHandler = originalExtraKeys[key];
                    originalExtraKeys[key] = () => {
                        // Get the appropriate range based on the action
                        let range;
                        if (action === 'editor: eval block') {
                            const block = getCurrentBlock();
                            range = { start: block.start, end: block.end };
                        } else if (action === 'editor: eval line') {
                            const line = cm.getCursor().line;
                            range = {
                                start: { line, ch: 0 },
                                end: { line: line + 1, ch: 0 }
                            };
                        } else if (action === 'editor: eval all') {
                            range = {
                                start: { line: 0, ch: 0 },
                                end: { line: cm.lineCount(), ch: 0 }
                            };
                        }

                        // Store the range and get its code
                        const rangeCode = cm.getRange(range.start, range.end);
                        actions.updateCode(rangeCode, range);

                        // Update GUI before evaluation
                        this.updateGUI();

                        Logger.log('lastEvalRange', range);

                        // Let Hydra's handler do its thing
                        originalHandler();
                    };
                }
            });

            // Update CodeMirror options with our wrapped key handlers
            cm.setOption('extraKeys', originalExtraKeys);

            Logger.log('Successfully hooked into Hydra editor');
        }
    }, 100);
};