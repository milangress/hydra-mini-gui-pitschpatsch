// Unified manager for finding and updating numeric values in code
import { Parser } from 'acorn';
import { generate, GENERATOR } from 'astring';
import { attachComments, makeTraveler } from 'astravel';

export class CodeValueManager {
    constructor(hydra) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
        this._pendingChanges = [];
        this._undoGroup = null;
        this.valuePositions = null;
    }

    /**
     * Find all numeric values in the given code and return their positions and metadata
     * @param {string} code - The code to analyze
     * @returns {Array<{value: number, lineNumber: number, ch: number, length: number, index: number, functionName: string, parameterIndex: number}>}
     */
    findValues(code) {
        if (!code) return [];

        try {
            const ast = Parser.parse(code, {
                locations: true,
                ecmaVersion: 'latest'
            });

            const matches = [];
            let currentIndex = 0;

            const traveler = makeTraveler({
                go: function(node, state) {
                    if (node.type === 'Literal' && typeof node.value === 'number') {
                        const line = code.split('\n')[node.loc.start.line - 1];
                        if (!line?.includes('loadScript')) {
                            const lineStart = node.loc.start.line - 1;
                            const parent = state.parents[state.parents.length - 1];
                            
                            // Extract function context
                            let functionName = 'unknown';
                            let paramCount = 0;
                            if (parent?.type === 'CallExpression' && parent.callee?.type === 'MemberExpression') {
                                functionName = parent.callee.property.name;
                                paramCount = parent.arguments.findIndex(arg => arg === node);
                                if (paramCount === -1) paramCount = parent.arguments.length;
                            }

                            // Get line content and context around the number
                            const lineContent = code.split('\n')[lineStart];
                            const beforeNumber = lineContent.substring(Math.max(0, node.loc.start.column - 20), node.loc.start.column);
                            const afterNumber = lineContent.substring(node.loc.end.column, Math.min(lineContent.length, node.loc.end.column + 20));

                            console.log(`Found number ${node.value} in function "${functionName}" as parameter ${paramCount}:`, {
                                lineNumber: lineStart,
                                characterPosition: node.loc.start.column,
                                length: node.loc.end.column - node.loc.start.column,
                                absolutePosition: currentIndex,
                                lineContent,
                                beforeNumber,
                                afterNumber,
                                functionName,
                                parameterIndex: paramCount
                            });

                            matches.push({
                                value: node.value,
                                lineNumber: lineStart,
                                ch: node.loc.start.column,
                                length: node.loc.end.column - node.loc.start.column,
                                index: currentIndex++,
                                functionName,
                                parameterIndex: paramCount
                            });
                        }
                    }
                    const oldParents = state.parents;
                    state.parents = [...oldParents, node];
                    this.super.go.call(this, node, state);
                    state.parents = oldParents;
                }
            });

            traveler.go(ast, { parents: [] });
            console.log('\nAll matches:', matches);
            return matches;
        } catch (error) {
            console.error('Error finding values:', error);
            return [];
        }
    }

    /**
     * Update a numeric value in the code while preserving formatting
     * @param {number} index - The index of the value to update
     * @param {number} newValue - The new value to set
     * @param {Array} valuePositions - Array of value positions from findValues()
     * @param {{start: any, end: any}} lastEvalRange - The range of code being evaluated
     */
    updateValue(index, newValue, valuePositions, lastEvalRange) {
        if (!window.cm || !lastEvalRange) return;

        console.log('Updating value:', { index, newValue, lastEvalRange });

        if (index >= valuePositions.length) return;

        const pos = valuePositions[index];
        const cm = window.cm;

        console.log('Number position info:', {
            value: pos.value,
            lineNumber: pos.lineNumber,
            characterPosition: pos.ch,
            length: pos.length,
            absolutePosition: pos.index,
            lineContent: cm.getLine(pos.lineNumber),
            beforeNumber: cm.getLine(pos.lineNumber).substring(Math.max(0, pos.ch - 20), pos.ch),
            afterNumber: cm.getLine(pos.lineNumber).substring(pos.ch + pos.length, pos.ch + pos.length + 20)
        });

        this.isUpdating = true;
        this.valuePositions = valuePositions;
        this._pendingChanges.push({
            index,
            newValue,
            timestamp: Date.now()
        });

        try {
            const code = cm.getRange(lastEvalRange.start, lastEvalRange.end);
            const newCode = this._generateCodeWithChanges(code);
            if (!newCode) return;

            // Handle CodeMirror operations
            if (!this._undoGroup) {
                cm.startOperation();
                this._undoGroup = { lastUpdate: Date.now() };
            }

            cm.replaceRange(newCode, lastEvalRange.start, lastEvalRange.end);
            this._undoGroup.lastUpdate = Date.now();

            // Clean up operations after delay
            clearTimeout(this._updateTimeout);
            this._updateTimeout = setTimeout(() => {
                if (this._undoGroup) {
                    cm.endOperation();
                    this._undoGroup = null;
                }
                this._pendingChanges = [];
                this.isUpdating = false;
            }, 2000);

            // Evaluate updated code
            if (this.hydra?.eval) {
                requestAnimationFrame(() => this.hydra.eval(newCode));
            }

        } catch (error) {
            console.error('Error updating value:', error);
            if (this._undoGroup) {
                window.cm.endOperation();
                this._undoGroup = null;
            }
            this.isUpdating = false;
        }
    }

    /**
     * Format a number consistently based on its magnitude
     * @private
     */
    _formatNumber(num) {
        if (Number.isNaN(num)) return 'NaN';
        if (!Number.isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
        
        if (Math.abs(num) < 1) {
            return num.toFixed(3).replace(/\.?0+$/, '');
        } else if (Math.abs(num) < 10) {
            return num.toFixed(2).replace(/\.?0+$/, '');
        }
        return Math.round(num).toString();
    }

    /**
     * Generate new code with updated values while preserving formatting
     * @private
     */
    _generateCodeWithChanges(code) {
        try {
            const lines = code.split('\n');
            
            // Critical: Store exact positions of numbers and formatting to preserve code structure
            const originalStructure = {
                lines: lines,
                numbers: [],  // Tracks exact position and value of each number
                format: code,
                indentation: new Map(),
                lineBreaks: new Map(),
                dotOperators: new Map()
            };

            // Find and store exact positions of all numbers in the code
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

            // Store exact indentation and dot operator positions
            lines.forEach((line, i) => {
                const indent = line.match(/^\s*/)[0];
                originalStructure.indentation.set(i, indent);
                
                const dotPositions = [];
                let pos = 0;
                while ((pos = line.indexOf('.', pos)) !== -1) {
                    dotPositions.push(pos);
                    pos++;
                }
                if (dotPositions.length) {
                    originalStructure.dotOperators.set(i, dotPositions);
                }

                // Store line break type
                if (line.endsWith('\r\n')) {
                    originalStructure.lineBreaks.set(i, '\r\n');
                } else if (line.endsWith('\n')) {
                    originalStructure.lineBreaks.set(i, '\n');
                }
            });

            const comments = [];
            const ast = Parser.parse(code, {
                locations: true,
                onComment: comments,
                ecmaVersion: 2022
            });

            const valueMap = new Map();
            this._pendingChanges.forEach(change => {
                valueMap.set(change.index, change.newValue);
            });

            // Format numbers consistently based on their magnitude
            const formatNumber = (num) => {
                if (Number.isNaN(num)) return 'NaN';
                if (!Number.isFinite(num)) return num > 0 ? 'Infinity' : '-Infinity';
                
                let str = '';
                if (Math.abs(num) < 1) {
                    str = num.toFixed(3).replace(/\.?0+$/, '');
                } else if (Math.abs(num) < 10) {
                    str = num.toFixed(2).replace(/\.?0+$/, '');
                } else {
                    str = Math.round(num).toString();
                }
                
                return str;
            };

            // AST traversal to update number values while preserving node types
            const traveler = makeTraveler({
                go: function(node, state) {
                    if (state.valueMap.has(state.currentIndex)) {
                        const newValue = state.valueMap.get(state.currentIndex);
                        
                        if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
                            if (newValue < 0) {
                                node.argument.value = Math.abs(newValue);
                                node.argument.raw = formatNumber(Math.abs(newValue));
                            } else {
                                node.type = 'Literal';
                                node.value = newValue;
                                node.raw = formatNumber(newValue);
                                delete node.operator;
                                delete node.prefix;
                                delete node.argument;
                            }
                            state.currentIndex++;
                        } else if (node.type === 'Literal' && typeof node.value === 'number') {
                            if (newValue < 0) {
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
            attachComments(ast, comments);

            // Custom generator to preserve exact original formatting
            const formattingGenerator = Object.create(GENERATOR);
            Object.assign(formattingGenerator, {
                _currentLine: 0,
                _formatNumber: formatNumber,
                MemberExpression(node, state) {
                    this[node.object.type](node.object, state);
                    const indent = originalStructure.indentation.get(this._currentLine) || '';
                    const dots = originalStructure.dotOperators.get(this._currentLine) || [];
                    
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
                    const numbers = [];
                    node.body.forEach(stmt => {
                        this.findNumbers(stmt, numbers);
                    });

                    // Replace only the changed numbers while preserving exact positions
                    let output = originalStructure.format;
                    let offset = 0;
                    originalStructure.numbers.forEach((num, i) => {
                        if (valueMap.has(i)) {
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

            const generatedCode = generate(ast, {
                generator: formattingGenerator,
                comments: true
            });

            // Verify the generated code is valid and contains more than just a number
            if (!generatedCode || generatedCode.trim().match(/^-?\d+\.?\d*$/)) {
                console.error('Invalid generated code:', generatedCode);
                return code; // Return original code if generation failed
            }

            return generatedCode;
        } catch (error) {
            console.error('Error generating code:', error);
            return code; // Return original code on error
        }
    }
} 