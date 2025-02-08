// Value updating functionality with AST parsing
import { Parser } from 'acorn';
import { generate } from 'astring';
import { defaultTraveler, attachComments, makeTraveler } from 'astravel';

export class ValueUpdater {
    constructor(hydra) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
        this._pendingChanges = [];
        this._undoGroup = null;
    }

    updateValue(index, newValue, valuePositions, lastEvalRange, currentCode) {
        if (!window.cm || !lastEvalRange) return;

        // Add change to pending changes
        this._pendingChanges.push({
            index,
            newValue,
            timestamp: Date.now()
        });

        try {
            const cm = window.cm;
            const code = cm.getRange(lastEvalRange.start, lastEvalRange.end);
            
            // Generate new code with current changes
            const newCode = this._generateCodeWithChanges(code);
            if (!newCode) return;

            // Start or continue undo group
            if (!this._undoGroup) {
                cm.startOperation();
                this._undoGroup = {
                    lastUpdate: Date.now()
                };
            }

            // Update the editor immediately
            cm.replaceRange(newCode, lastEvalRange.start, lastEvalRange.end);
            
            // Update lastUpdate time
            this._undoGroup.lastUpdate = Date.now();

            // Schedule the end of the undo group
            clearTimeout(this._updateTimeout);
            this._updateTimeout = setTimeout(() => {
                if (this._undoGroup) {
                    cm.endOperation();
                    this._undoGroup = null;
                }
                this._pendingChanges = [];
            }, 2000);

            // Immediately evaluate for visual feedback
            if (this.hydra?.eval) {
                requestAnimationFrame(() => {
                    this.hydra.eval(newCode);
                });
            }

        } catch (error) {
            console.error('Error updating value:', error);
            // Clean up if there was an error
            if (this._undoGroup) {
                window.cm.endOperation();
                this._undoGroup = null;
            }
        }
    }

    _generateCodeWithChanges(code) {
        try {
            // Parse to AST
            const comments = [];
            const ast = Parser.parse(code, {
                locations: true,
                onComment: comments
            });

            // Create a map of positions to new values
            const valueMap = new Map();
            this._pendingChanges.forEach(change => {
                valueMap.set(change.index, change.newValue);
            });

            // Create AST traveler to update values
            const traveler = makeTraveler({
                go: function(node, state) {
                    if (node.type === 'Literal' && typeof node.value === 'number') {
                        if (state.valueMap.has(state.currentIndex)) {
                            node.value = state.valueMap.get(state.currentIndex);
                            node.raw = String(node.value);
                        }
                        state.currentIndex++;
                    }
                    this.super.go.call(this, node, state);
                }
            });

            // Update the AST
            traveler.go(ast, { valueMap, currentIndex: 0 });

            // Put comments back
            attachComments(ast, comments);

            // Generate new code
            return generate(ast, { comments: true });
        } catch (error) {
            console.error('Error generating code:', error);
            return null;
        }
    }
} 