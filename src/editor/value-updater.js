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
                    // Handle both literal numbers and unary expressions (negative numbers)
                    if (state.valueMap.has(state.currentIndex)) {
                        const newValue = state.valueMap.get(state.currentIndex);
                        
                        if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
                            console.log('found negative number', newValue);
                            // We found a negative number
                            if (newValue < 0) {
                                // Keep it negative, just update the value
                                node.argument.value = Math.abs(newValue);
                                node.argument.raw = this._formatNumber(Math.abs(newValue));
                            } else {
                                // Convert to positive literal
                                Object.assign(node, {
                                    type: 'Literal',
                                    value: newValue,
                                    raw: this._formatNumber(newValue)
                                });
                            }
                            state.currentIndex++;
                        } else if (node.type === 'Literal' && typeof node.value === 'number') {
                            console.log('found positive number', newValue);
                            // We found a positive number
                            if (newValue < 0) {
                                // Convert to negative (UnaryExpression)
                                Object.assign(node, {
                                    type: 'UnaryExpression',
                                    operator: '-',
                                    prefix: true,
                                    argument: {
                                        type: 'Literal',
                                        value: Math.abs(newValue),
                                        raw: this._formatNumber(Math.abs(newValue))
                                    }
                                });
                            } else {
                                // Keep as positive literal
                                node.value = newValue;
                                node.raw = this._formatNumber(newValue);
                            }
                            state.currentIndex++;
                        }
                    } else if ((node.type === 'Literal' && typeof node.value === 'number') ||
                             (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal')) {
                        state.currentIndex++;
                    }
                    
                    this.super.go.call(this, node, state);
                },
                _formatNumber(num) {
                    // Handle special cases
                    if (Number.isNaN(num)) return 'NaN';
                    if (!Number.isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
                    
                    // Convert to string with proper precision
                    let str = '';
                    if (Math.abs(num) < 1) {
                        // For small numbers, use more precision
                        str = num.toFixed(3).replace(/\.?0+$/, '');
                    } else if (Math.abs(num) < 10) {
                        // For medium numbers, use less precision
                        str = num.toFixed(2).replace(/\.?0+$/, '');
                    } else {
                        // For large numbers, use no decimal places
                        str = Math.round(num).toString();
                    }
                    
                    return str;
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