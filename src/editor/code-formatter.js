import { generate, GENERATOR } from 'astring';
import { Logger } from '../utils/logger.js';

/**
 * Handles the formatting and generation of Hydra code while preserving code structure,
 * number precision, and formatting details like whitespace and line breaks.
 * Provides functionality for replacing numeric values with arrow functions while
 * maintaining the original code style.
 */
export class CodeFormatter {
    /**
     * Creates a new CodeFormatter instance
     * @param {Object} hydra - The Hydra instance used for accessing source/output references
     */
    constructor(hydra) {
        this.hydra = hydra;
        // Bind methods to ensure proper this context
        this.formatNumber = this.formatNumber.bind(this);
        this.generateCode = this.generateCode.bind(this);
        this.analyzeCodeStructure = this.analyzeCodeStructure.bind(this);
        this.createFormattingGenerator = this.createFormattingGenerator.bind(this);
    }

    /**
     * Formats a number with appropriate precision based on its magnitude.
     * Uses different precision rules for different ranges:
     * - Numbers < 1: 3 decimal places
     * - Numbers < 10: 2 decimal places
     * - Numbers >= 10: rounded to integers
     * 
     * @param {number} num - The number to format
     * @returns {string} The formatted number as a string with appropriate precision
     */
    formatNumber(num) {
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
     * Generates formatted code from an AST while preserving original formatting and structure.
     * Can replace numeric values with either static values or arrow functions based on the valueMap.
     * 
     * @param {Object} ast - Abstract Syntax Tree of the code
     * @param {string} code - Original source code
     * @param {Map<number, (number|string)>} valueMap - Map of value indices to their new values.
     *                                                  Values can be numbers for static updates or
     *                                                  strings for arrow function conversions
     * @param {Array} [comments=[]] - Array of code comments to preserve
     * @returns {string} Generated code with preserved formatting and updated values
     * @throws {Error} If code generation fails or produces invalid output
     */
    generateCode(ast, code, valueMap, comments = []) {
        if (!ast || !code) return code;
        valueMap = valueMap || new Map();

        try {
            // Store exact positions of numbers and formatting
            const originalStructure = this.analyzeCodeStructure(code);

            // Create custom generator to preserve formatting
            const formattingGenerator = this.createFormattingGenerator(originalStructure, valueMap);

            // Generate code with preserved formatting
            const generatedCode = generate(ast, {
                generator: formattingGenerator,
                comments: true
            });

            // Verify the generated code is valid
            if (!generatedCode || generatedCode.trim().match(/^-?\d+\.?\d*$/)) {
                Logger.error('Invalid generated code:', generatedCode);
                return code;
            }

            return generatedCode;
        } catch (error) {
            Logger.error('Error generating code:', error);
            return code;
        }
    }

    /**
     * Analyzes the structure of source code to preserve formatting details during code generation.
     * Captures information about:
     * - Line breaks and their types (\n or \r\n)
     * - Indentation patterns
     * - Numeric literal positions and values
     * - Source/output identifier positions
     * - Dot operator positions for method chaining
     * 
     * @param {string} code - Source code to analyze
     * @returns {Object} Structure containing:
     *   @returns {string[]} .lines - Array of code lines
     *   @returns {Array<{value: number, start: number, end: number, text: string}>} .numbers - Numeric literal positions
     *   @returns {Array<{value: string, start: number, end: number, text: string}>} .identifiers - Source/output positions
     *   @returns {string} .format - Original code format
     *   @returns {Map<number, string>} .indentation - Line number to indentation mapping
     *   @returns {Map<number, string>} .lineBreaks - Line number to line break style mapping
     *   @returns {Map<number, number[]>} .dotOperators - Line number to dot positions mapping
     */
    analyzeCodeStructure(code) {
        const lines = code.split('\n');
        const structure = {
            lines,
            numbers: [],
            identifiers: [],
            format: code,
            indentation: new Map(),
            lineBreaks: new Map(),
            dotOperators: new Map()
        };

        // Find numbers
        let numberMatch;
        const numberRegex = /(?:-)?\d+\.?\d*/g;
        while ((numberMatch = numberRegex.exec(code)) !== null) {
            structure.numbers.push({
                value: parseFloat(numberMatch[0]),
                start: numberMatch.index,
                end: numberMatch.index + numberMatch[0].length,
                text: numberMatch[0]
            });
        }

        // Find identifiers (sources/outputs)
        const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label ?? `o${i}`);
        const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label ?? `s${i}`);
        const validIdentifiers = [...availableOutputs, ...availableSources];

        let identifierMatch;
        const identifierRegex = new RegExp(`\\b(${validIdentifiers.join('|')})\\b`, 'g');
        while ((identifierMatch = identifierRegex.exec(code)) !== null) {
            structure.identifiers.push({
                value: identifierMatch[0],
                start: identifierMatch.index,
                end: identifierMatch.index + identifierMatch[0].length,
                text: identifierMatch[0]
            });
        }

        // Store formatting details
        lines.forEach((line, i) => {
            structure.indentation.set(i, line.match(/^\s*/)[0]);
            
            const dotPositions = [];
            let pos = 0;
            while ((pos = line.indexOf('.', pos)) !== -1) {
                dotPositions.push(pos);
                pos++;
            }
            if (dotPositions.length) {
                structure.dotOperators.set(i, dotPositions);
            }

            if (line.endsWith('\r\n')) structure.lineBreaks.set(i, '\r\n');
            else if (line.endsWith('\n')) structure.lineBreaks.set(i, '\n');
        });

        return structure;
    }

    /**
     * Creates a custom AST generator that preserves code formatting during generation.
     * Handles special cases like:
     * - Method chaining with dot operators
     * - Function calls and their arguments
     * - Number formatting with appropriate precision
     * - Arrow function conversions
     * - Source/output reference preservation
     * 
     * @param {Object} originalStructure - Original code structure from analyzeCodeStructure
     * @param {Map<number, (number|string)>} valueMap - Map of values to be replaced
     * @returns {Object} Custom AST generator with methods for each node type:
     *   - MemberExpression: Handles method chaining
     *   - CallExpression: Handles function calls
     *   - Program: Handles overall code generation
     *   - findValues: Helper for value detection
     */
    createFormattingGenerator(originalStructure, valueMap) {
        const formattingGenerator = Object.create(GENERATOR);
        
        // Get available sources and outputs for validation
        const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label ?? `o${i}`);
        const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label ?? `s${i}`);
        const validIdentifiers = [...availableOutputs, ...availableSources];

        Object.assign(formattingGenerator, {
            _currentLine: 0,
            _formatNumber: this.formatNumber.bind(this),
            _validIdentifiers: validIdentifiers,
            _valueMap: valueMap,

            MemberExpression(node, state) {
                this[node.object.type](node.object, state);
                const indent = originalStructure.indentation.get(this._currentLine) ?? '';
                const dots = originalStructure.dotOperators.get(this._currentLine) ?? [];
                
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
                const numbers = [];
                const identifiers = [];
                node.body.forEach(stmt => {
                    this.findValues(stmt, numbers, identifiers);
                });

                // Replace only the changed values while preserving exact positions
                let output = originalStructure.format;
                let offset = 0;

                // Sort all replacements by their position to handle them in order
                const allReplacements = [
                    ...originalStructure.numbers.map((num, i) => ({
                        ...num,
                        index: i,
                        type: 'number'
                    })),
                    ...originalStructure.identifiers.map((id, i) => ({
                        ...id,
                        index: originalStructure.numbers.length + i,
                        type: 'identifier'
                    }))
                ].sort((a, b) => a.start - b.start);

                allReplacements.forEach(item => {
                    if (this._valueMap.has(item.index)) {
                        const newValue = this._valueMap.get(item.index);
                        let formattedValue;
                        
                        if (item.type === 'number') {
                            // Handle both number replacements and arrow function replacements
                            formattedValue = typeof newValue === 'number' ? 
                                (newValue < 0 ? '-' + this._formatNumber(Math.abs(newValue)) : this._formatNumber(newValue)) :
                                newValue; // Use string value directly if it's not a number (e.g. arrow function)
                        } else {
                            formattedValue = typeof newValue === 'string' ? newValue : item.text;
                        }

                        const start = item.start + offset;
                        const end = item.end + offset;
                        output = output.slice(0, start) + formattedValue + output.slice(end);
                        offset += formattedValue.length - (item.end - item.start);
                    }
                });

                state.write(output);
            },

            findValues(node, numbers, identifiers) {
                if (node.type === 'Literal' && typeof node.value === 'number') {
                    numbers.push(node.value);
                } else if (node.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal') {
                    numbers.push(-node.argument.value);
                } else if (node.type === 'Identifier' && this._validIdentifiers.includes(node.name)) {
                    identifiers.push(node.name);
                }
                for (const key in node) {
                    if (node[key] && typeof node[key] === 'object') {
                        this.findValues(node[key], numbers, identifiers);
                    }
                }
            }
        });

        return formattingGenerator;
    }
} 