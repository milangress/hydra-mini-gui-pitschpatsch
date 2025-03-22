import { generate, GENERATOR } from 'astring';
import { Node, CallExpression, MemberExpression, Program, Literal, Identifier } from 'acorn';
import { Logger } from '../utils/logger';
import { HydraInstance } from './ast/types';
import { CodeStructure, CustomGenerator, FormattingState, CodePosition } from './types';

/**
 * Handles the formatting and generation of Hydra code while preserving code structure,
 * number precision, and formatting details like whitespace and line breaks.
 * Provides functionality for replacing numeric values with arrow functions while
 * maintaining the original code style.
 */
export class CodeFormatter {
    private hydra: HydraInstance;

    /**
     * Creates a new CodeFormatter instance
     * @param hydra - The Hydra instance used for accessing source/output references
     */
    constructor(hydra: HydraInstance) {
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
     */
    formatNumber(num: number): string {
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
     */
    generateCode(
        ast: Node | null,
        code: string | null,
        valueMap?: Map<number, number | string>,
        comments: any[] = []
    ): string {
        if (!ast || !code) return code || '';
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
     */
    analyzeCodeStructure(code: string): CodeStructure {
        const lines = code.split('\n');
        const structure: CodeStructure = {
            lines,
            numbers: [],
            identifiers: [],
            format: code,
            indentation: new Map(),
            lineBreaks: new Map(),
            dotOperators: new Map()
        };

        // Find numbers
        let numberMatch: RegExpExecArray | null;
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

        let identifierMatch: RegExpExecArray | null;
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
            const indentMatch = line.match(/^\s*/);
            structure.indentation.set(i, indentMatch ? indentMatch[0] : '');
            
            const dotPositions: number[] = [];
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
     */
    createFormattingGenerator(
        originalStructure: CodeStructure,
        valueMap: Map<number, number | string>
    ): CustomGenerator {
        const formattingGenerator = Object.create(GENERATOR) as CustomGenerator;
        
        // Get available sources and outputs for validation
        const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label ?? `o${i}`);
        const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label ?? `s${i}`);
        const validIdentifiers = [...availableOutputs, ...availableSources];

        Object.assign(formattingGenerator, {
            _currentLine: 0,
            _formatNumber: this.formatNumber.bind(this),
            _validIdentifiers: validIdentifiers,
            _valueMap: valueMap,

            MemberExpression(node: MemberExpression, state: FormattingState) {
                this[node.object.type](node.object, state);
                const indent = originalStructure.indentation.get(this._currentLine) ?? '';
                const dots = originalStructure.dotOperators.get(this._currentLine) ?? [];
                
                if (dots.length > 0) {
                    state.write('.');
                }
                this[node.property.type](node.property, state);
            },

            CallExpression(node: CallExpression, state: FormattingState) {
                this[node.callee.type](node.callee, state);
                state.write('(');
                const args = node.arguments;
                for (let i = 0; i < args.length; i++) {
                    this[args[i].type](args[i], state);
                    if (i < args.length - 1) state.write(', ');
                }
                state.write(')');
            },

            Program(node: Program, state: FormattingState) {
                const numbers: CodePosition[] = [];
                const identifiers: CodePosition[] = [];
                node.body.forEach((stmt: Node) => {
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
                        type: 'number' as const
                    })),
                    ...originalStructure.identifiers.map((id, i) => ({
                        ...id,
                        index: originalStructure.numbers.length + i,
                        type: 'identifier' as const
                    }))
                ].sort((a, b) => a.start - b.start);

                allReplacements.forEach(item => {
                    if (this._valueMap.has(item.index)) {
                        const newValue = this._valueMap.get(item.index);
                        const formattedValue = typeof newValue === 'number' ? 
                            this._formatNumber(newValue) : 
                            String(newValue);

                        const start = item.start + offset;
                        const end = item.end + offset;
                        output = output.slice(0, start) + formattedValue + output.slice(end);
                        offset += formattedValue.length - (end - start);
                    }
                });

                state.write(output);
            },

            findValues(node: Node, numbers: CodePosition[], identifiers: CodePosition[]) {
                if (!node || typeof node !== 'object') return;

                if (node.type === 'Literal' && typeof (node as Literal).value === 'number') {
                    const literalNode = node as Literal;
                    numbers.push({
                        value: literalNode.value as number,
                        start: (node as any).start,
                        end: (node as any).end,
                        text: literalNode.raw || String(literalNode.value)
                    });
                } else if (node.type === 'Identifier' && this._validIdentifiers.includes((node as Identifier).name)) {
                    identifiers.push({
                        value: (node as Identifier).name,
                        start: (node as any).start,
                        end: (node as any).end,
                        text: (node as Identifier).name
                    });
                }

                for (const key in node) {
                    const child = (node as any)[key];
                    if (child && typeof child === 'object') {
                        this.findValues(child, numbers, identifiers);
                    }
                }
            }
        });

        return formattingGenerator;
    }
} 