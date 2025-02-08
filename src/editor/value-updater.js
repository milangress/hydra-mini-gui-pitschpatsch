// Value updating functionality with AST parsing
import { Parser } from 'acorn';
import { generate, GENERATOR } from 'astring';
import { attachComments, makeTraveler } from 'astravel';

export class ValueUpdater {
    constructor(hydra) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
        this._pendingChanges = [];
        this._undoGroup = null;
        this.valuePositions = null;
    }

    updateValue(index, newValue, valuePositions, lastEvalRange, currentCode) {
        if (!window.cm || !lastEvalRange) return;

        // Store valuePositions for reference
        this.valuePositions = valuePositions;

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
            // Store original formatting
            const lines = code.split('\n');
            const lineStarts = new Map();
            const lineEnds = new Map();
            
            // Store the exact original structure
            const originalStructure = {
                lines: lines,
                numbers: [],  // Store original numbers and their positions
                format: code,  // Keep original format
                indentation: new Map(),
                lineBreaks: new Map(),
                dotOperators: new Map()
            };

            // Find all numbers in the original code
            let numberMatch;
            const numberRegex = /(?:-)?\d+\.?\d*/g;
            while ((numberMatch = numberRegex.exec(code)) !== null) {
                originalStructure.numbers.push({
                    value: parseFloat(numberMatch[0]),
                    start: numberMatch.index,
                    end: numberMatch.index + numberMatch[0].length,
                    text: numberMatch[0]
                });
            }

            // Map the exact structure of the original code
            lines.forEach((line, i) => {
                const indent = line.match(/^\s*/)[0];
                originalStructure.indentation.set(i, indent);
                
                // Track dot operators and their exact position in the line
                const dotPositions = [];
                let pos = 0;
                while ((pos = line.indexOf('.', pos)) !== -1) {
                    dotPositions.push(pos);
                    pos++;
                }
                if (dotPositions.length) {
                    originalStructure.dotOperators.set(i, dotPositions);
                }
            });

            // Parse to AST with explicit ecmaVersion
            const comments = [];
            const ast = Parser.parse(code, {
                locations: true,
                onComment: comments,
                ecmaVersion: 2022
            });

            // Create a map of positions to new values
            const valueMap = new Map();
            this._pendingChanges.forEach(change => {
                valueMap.set(change.index, change.newValue);
            });

            // Helper function for formatting numbers consistently
            const formatNumber = (num) => {
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
            };

            // Update the AST
            const traveler = makeTraveler({
                go: function(node, state) {
                    // Handle both literal numbers and unary expressions (negative numbers)
                    if (state.valueMap.has(state.currentIndex)) {
                        const newValue = state.valueMap.get(state.currentIndex);
                        
                        if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
                            // We found a negative number
                            if (newValue < 0) {
                                // Keep it negative, just update the value
                                node.argument.value = Math.abs(newValue);
                                node.argument.raw = formatNumber(Math.abs(newValue));
                            } else {
                                // Convert to positive literal
                                node.type = 'Literal';
                                node.value = newValue;
                                node.raw = formatNumber(newValue);
                                delete node.operator;
                                delete node.prefix;
                                delete node.argument;
                            }
                            state.currentIndex++;
                        } else if (node.type === 'Literal' && typeof node.value === 'number') {
                            // We found a positive number
                            if (newValue < 0) {
                                // Convert to negative (UnaryExpression)
                                node.type = 'UnaryExpression';
                                node.operator = '-';
                                node.prefix = true;
                                node.argument = {
                                    type: 'Literal',
                                    value: Math.abs(newValue),
                                    raw: formatNumber(Math.abs(newValue))
                                };
                                delete node.value;
                                delete node.raw;
                            } else {
                                // Keep as positive literal
                                node.value = newValue;
                                node.raw = formatNumber(newValue);
                            }
                            state.currentIndex++;
                        }
                    } else if ((node.type === 'Literal' && typeof node.value === 'number') ||
                             (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal')) {
                        state.currentIndex++;
                    }
                    
                    this.super.go.call(this, node, state);
                }
            });
            traveler.go(ast, { valueMap, currentIndex: 0 });

            // Put comments back
            attachComments(ast, comments);

            // Custom generator that preserves exact original formatting
            const formattingGenerator = Object.create(GENERATOR);
            Object.assign(formattingGenerator, {
                _currentLine: 0,
                _formatNumber: formatNumber,
                MemberExpression(node, state) {
                    this[node.object.type](node.object, state);
                    const indent = originalStructure.indentation.get(this._currentLine) || '';
                    const dots = originalStructure.dotOperators.get(this._currentLine) || [];
                    
                    // If this was a dot operator in the original code, preserve its exact formatting
                    if (dots.length > 0) {
                        state.write('.');
                    }
                    this[node.property.type](node.property, state);
                },
                CallExpression(node, state) {
                    this[node.callee.type](node.callee, state);
                    state.write('(');
                    const args = node.arguments;
                    for (let i = 0; i < args.length; i++) {
                        this[args[i].type](args[i], state);
                        if (i < args.length - 1) state.write(', ');
                    }
                    state.write(')');
                },
                Program(node, state) {
                    this._currentLine = 0;
                    // Get all numbers from the AST in order
                    const numbers = [];
                    node.body.forEach(stmt => {
                        this.findNumbers(stmt, numbers);
                    });

                    // Create new code by replacing only the changed numbers
                    let output = originalStructure.format;
                    let offset = 0;
                    originalStructure.numbers.forEach((num, i) => {
                        if (valueMap.has(i)) {
                            // This number needs to be updated
                            const newValue = valueMap.get(i);
                            const formattedValue = newValue < 0 ? '-' + formatNumber(Math.abs(newValue)) : formatNumber(newValue);
                            const start = num.start + offset;
                            const end = num.end + offset;
                            output = output.slice(0, start) + formattedValue + output.slice(end);
                            offset += formattedValue.length - (num.end - num.start);
                        }
                    });
                    state.write(output);
                },
                findNumbers(node, numbers) {
                    if (node.type === 'Literal' && typeof node.value === 'number') {
                        numbers.push(node.value);
                    } else if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
                        numbers.push(-node.argument.value);
                    }
                    for (const key in node) {
                        if (node[key] && typeof node[key] === 'object') {
                            this.findNumbers(node[key], numbers);
                        }
                    }
                }
            });

            // Generate new code with preserved formatting
            const generatedCode = generate(ast, {
                generator: formattingGenerator,
                comments: true
            });

            return generatedCode;
        } catch (error) {
            console.error('Error generating code:', error);
            return null;
        }
    }
} 