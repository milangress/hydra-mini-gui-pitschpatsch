// Unified manager for finding and updating numeric values in code
import { Parser } from 'acorn';
import { ASTTraverser } from './ast/ast-traverser.js';
import { CodeFormatter } from './code-formatter.js';

export class CodeValueManager {
    constructor(hydra) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
        this._pendingChanges = [];
        this._undoGroup = null;
        this.valuePositions = null;
        
        this._astTraverser = new ASTTraverser(hydra);
        this._codeFormatter = new CodeFormatter(hydra);
    }


    /**
     * Find all numeric values and source/output references in the given code and return their positions and metadata
     * @param {string} code - The code to analyze
     * @returns {Array<{value: number|string, lineNumber: number, ch: number, length: number, index: number, functionName: string, parameterIndex: number, type: 'number'|'source'|'output'}>}
     */
    findValues(code) {
        if (!code) return [];

        try {
            const ast = Parser.parse(code, {
                locations: true,
                ecmaVersion: 'latest'
            });

            return this._astTraverser.findValues(ast, code);
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
            const ast = Parser.parse(code, {
                locations: true,
                ecmaVersion: 'latest'
            });

            const newCode = this._codeFormatter.generateCode(ast, code, new Map([[index, newValue]]));
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

} 