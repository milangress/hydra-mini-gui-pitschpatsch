// Unified manager for finding and updating numeric values in code
import { Parser } from 'acorn';
import { ASTTraverser } from './ast/ast-traverser.js';
import { CodeFormatter } from './code-formatter.js';
import { Logger } from '../utils/logger.js';
import { removeLoadScriptLines } from '../utils/code-utils.js';
import { effect } from '@preact/signals-core';
import { actions, parameters, currentParameters, currentCode, currentEvalRange } from '../state/signals.js';

/**
 * Manages the finding and updating of numeric values in Hydra code, handling both static values
 * and dynamic arrow function conversions.
 */
export class CodeValueManager {
    /**
     * Creates a new CodeValueManager instance
     * @param {Object} hydra - The Hydra instance to use for value management
     */
    constructor(hydra) {
        this.hydra = hydra;
        this.isUpdating = false;
        this._updateTimeout = null;
        this._pendingChanges = [];
        this._undoGroup = null;
        this.currentParameters = null;
        this._variableMap = new Map(); // Track which values have been converted to variables
        this._arrowFunctionCode = null; // Track current code with all arrow functions
        
        this._astTraverser = new ASTTraverser(hydra);
        this._codeFormatter = new CodeFormatter(hydra);

        // Watch for parameter changes and update code accordingly
        effect(() => {
            const params = parameters.value;
            if (params.length === 0) return;
            Logger.log('CodeValueManager effect', { params });

            for (const param of params) {
                Logger.log('CodeValueManager effect - updating value:', param);
                this.updateValue(
                    param.index,
                    param.value,
                    param,
                    currentEvalRange.value,
                );
            }
        });

    effect(() => {
        const newCurrentCode = currentCode.value;
        if (!newCurrentCode) return;
        Logger.log('currentEvalRange Signal updated triggering findValues');
        this.findValues(newCurrentCode);
    });
}

    /**
     * Find all numeric values and source/output references in the given code and return their positions and metadata
     * @param {string} code - The code to analyze
     * @returns {Array<{value: number|string, lineNumber: number, ch: number, length: number, index: number, functionName: string, parameterIndex: number, type: 'number'|'source'|'output'}>}
     */
    findValues(code) {
        if (!code) return [];

        try {
            // Remove loadScript lines before parsing
            const cleanCode = removeLoadScriptLines(code);
            const ast = Parser.parse(cleanCode, {
                locations: true,
                ecmaVersion: 'latest'
            });

            const foundValues = this._astTraverser.findValues(ast, cleanCode);

            console.log('foundValues', foundValues);
            // Update store directly with found values
            actions.currentParameters(foundValues);
            return foundValues;
        } catch (error) {
            console.error('Error finding values:', error);
            actions.currentParameters([]);
            return [];
        }
    }

    /**
     * Try to evaluate code with arrow functions, falling back to static values if evaluation fails
     * @param {string} arrowCode - Code containing arrow functions to evaluate
     * @param {string} staticCode - Fallback static code to evaluate if arrow functions fail
     * @param {string} variableName - Name of the variable being updated
     * @param {number} newValue - New value to set
     * @returns {boolean} Whether the evaluation was successful
     * @private
     */
    _tryEval(arrowCode, staticCode, variableName, newValue) {
        if (!this.hydra?.eval) return false;

        try {
            // Try arrow function version
            this.hydra.eval(arrowCode);
            return true;
        } catch (error) {
            Logger.error('Arrow function eval failed:', error);
            
            // Clear state since arrow function failed
            this._variableMap.clear();
            this._arrowFunctionCode = null;

            // Try static version
            try {
                this.hydra.eval(staticCode);
                return true;
            } catch (fallbackError) {
                Logger.error('Static eval failed:', fallbackError);
                return false;
            }
        }
    }

    /**
     * Update a numeric value in the code while preserving formatting. Handles both initial conversion
     * to arrow functions and subsequent updates to those functions. Includes fallback mechanisms
     * for handling evaluation failures.
     * 
     * @param {number} index - The index of the value to update in valuePositions array
     * @param {number} newValue - The new value to set
     * @param {Array} valuePositions - Array of value positions from findValues()
     * @param {{start: any, end: any}} lastEvalRange - The range of code being evaluated
     */
    updateValue(index, newValue, valuePositions, lastEvalRange) {
        console.log('updateValue', { index, newValue, valuePositions, lastEvalRange});
        if (!window.cm || !lastEvalRange) return;

        Logger.log('Updating value:', { index, newValue, lastEvalRange });

        if (index >= valuePositions.length) return;

        const pos = valuePositions;
        const cm = window.cm;

        Logger.log('Number position info:', pos);

        // Set flag before any updates
        this.isUpdating = true;
        this.valuePositions = valuePositions;
        this._pendingChanges.push({
            index,
            newValue,
            timestamp: Date.now()
        });

        try {
            const code = cm.getRange(lastEvalRange.start, lastEvalRange.end);
            const variableName = pos.key;

            // Check if this value has already been converted to a variable
            if (this._variableMap.has(index)) {
                // Try arrow function update first
                const arrowCode = `${variableName} = ${newValue};\n${this._arrowFunctionCode}`;
                
                // Generate static version for fallback
                const ast = Parser.parse(code, {
                    locations: true,
                    ecmaVersion: 'latest'
                });
                const staticCode = this._codeFormatter.generateCode(ast, code, new Map([[index, newValue]]));

                // Try eval with fallback
                this._tryEval(arrowCode, staticCode, variableName, newValue);
                
                // Clean up operations after delay
                clearTimeout(this._updateTimeout);
                this._updateTimeout = setTimeout(() => {
                    // Update editor with final value
                    const ast = Parser.parse(code, {
                        locations: true,
                        ecmaVersion: 'latest'
                    });

                    const newCode = this._codeFormatter.generateCode(ast, code, new Map([[index, newValue]]));
                    if (newCode) {
                        cm.startOperation();
                        cm.replaceRange(newCode, lastEvalRange.start, lastEvalRange.end);
                        cm.endOperation();
                    }
                    
                    // Clear state
                    this._pendingChanges = [];
                    this._variableMap.clear();
                    this._arrowFunctionCode = null;
                    this.isUpdating = false;
                }, 2000);
                
                return;
            }

            // First time - create arrow function code using the code formatter
            const ast = Parser.parse(code, {
                locations: true,
                ecmaVersion: 'latest'
            });

            // Create a map with all existing arrow functions plus this new one
            const updates = new Map(this._variableMap.entries());
            updates.set(index, `() => ${variableName}`);

            // Generate both arrow function and static versions
            const newArrowCode = this._codeFormatter.generateCode(ast, code, updates);
            const staticCode = this._codeFormatter.generateCode(ast, code, new Map([[index, newValue]]));

            if (!newArrowCode) {
                // If arrow function generation fails, use static version
                if (staticCode && this.hydra?.eval) {
                    this.hydra.eval(staticCode);
                }
                this.isUpdating = false;
                return;
            }

            // Track this value as converted and store the arrow function code
            this._variableMap.set(index, variableName);
            this._arrowFunctionCode = newArrowCode;

            // Evaluate both variable assignments and arrow function code
            const varAssignments = Array.from(this._variableMap.entries())
                .map(([idx, name]) => `${name} = ${this._pendingChanges.find(c => c.index === idx)?.newValue || valuePositions[idx].value}`)
                .join(';\n');
            
            const arrowCode = `${varAssignments};\n${newArrowCode}`;
            
            // Try eval with fallback
            this._tryEval(arrowCode, staticCode, variableName, newValue);

            // Set up debounce for final editor update
            clearTimeout(this._updateTimeout);
            this._updateTimeout = setTimeout(() => {
                // Update editor with final values
                const ast = Parser.parse(code, {
                    locations: true,
                    ecmaVersion: 'latest'
                });

                // Create map of final values
                const finalValues = new Map();
                for (const change of this._pendingChanges) {
                    finalValues.set(change.index, change.newValue);
                }

                const newCode = this._codeFormatter.generateCode(ast, code, finalValues);
                if (newCode) {
                    cm.startOperation();
                    cm.replaceRange(newCode, lastEvalRange.start, lastEvalRange.end);
                    cm.endOperation();
                }
                
                // Clear state
                this._pendingChanges = [];
                this._variableMap.clear();
                this._arrowFunctionCode = null;
                this.isUpdating = false;
            }, 2000);

        } catch (error) {
            Logger.error('Error updating value:', error);
            // If everything fails, fall back to direct value update
            try {
                const ast = Parser.parse(code, {
                    locations: true,
                    ecmaVersion: 'latest'
                });

                const newCode = this._codeFormatter.generateCode(ast, code, new Map([[index, newValue]]));
                if (newCode) {
                    if (!this._undoGroup) {
                        cm.startOperation();
                        this._undoGroup = { lastUpdate: Date.now() };
                    }
                    cm.replaceRange(newCode, lastEvalRange.start, lastEvalRange.end);
                    if (this.hydra?.eval) {
                        requestAnimationFrame(() => this.hydra.eval(newCode));
                    }
                }
            } catch (fallbackError) {
                Logger.error('Error in fallback update:', fallbackError);
            }
            if (this._undoGroup) {
                window.cm.endOperation();
                this._undoGroup = null;
            }
            this.isUpdating = false;
        }
    }
} 