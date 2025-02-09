import { generate, GENERATOR } from 'astring';

export class CodeFormatter {
    constructor(hydra) {
        this.hydra = hydra;
    }

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

    generateCode(ast, code, valueMap, comments = []) {
        try {
            const lines = code.split('\n');
            
            // Store exact positions of numbers and formatting
            const originalStructure = this._analyzeCodeStructure(code);

            // Create custom generator to preserve formatting
            const formattingGenerator = this._createFormattingGenerator(originalStructure, valueMap);

            // Generate code with preserved formatting
            const generatedCode = generate(ast, {
                generator: formattingGenerator,
                comments: true
            });

            // Verify the generated code is valid
            if (!generatedCode || generatedCode.trim().match(/^-?\d+\.?\d*$/)) {
                console.error('Invalid generated code:', generatedCode);
                return code;
            }

            return generatedCode;
        } catch (error) {
            console.error('Error generating code:', error);
            return code;
        }
    }

    _analyzeCodeStructure(code) {
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
        const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label || `o${i}`);
        const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label || `s${i}`);
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

    _createFormattingGenerator(originalStructure, valueMap) {
        const formattingGenerator = Object.create(GENERATOR);
        
        // Get available sources and outputs for validation
        const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label || `o${i}`);
        const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label || `s${i}`);
        const validIdentifiers = [...availableOutputs, ...availableSources];

        Object.assign(formattingGenerator, {
            _currentLine: 0,
            _formatNumber: this._formatNumber,
            _validIdentifiers: validIdentifiers,
            _valueMap: valueMap,

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
                            formattedValue = typeof newValue === 'number' ? 
                                (newValue < 0 ? '-' + this._formatNumber(Math.abs(newValue)) : this._formatNumber(newValue)) :
                                item.text;
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