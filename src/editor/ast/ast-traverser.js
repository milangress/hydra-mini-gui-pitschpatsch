import { makeTraveler } from 'astravel';
import { extractFunctionNameFromCode, countParametersBeforePosition } from '../../utils/code-utils.js';

/**
 * Traverses Abstract Syntax Trees (AST) of Hydra code to analyze and extract information
 * about numeric values, function calls, and parameter positions. Handles complex method
 * chaining patterns and maintains context during traversal.
 * 
 * Key features:
 * - Tracks function call chains (e.g., osc().color().out())
 * - Identifies parameter positions within function calls
 * - Extracts metadata about values (numbers, sources, outputs)
 * - Maintains parent-child relationships during traversal
 */
export class ASTTraverser {
    /**
     * Creates a new ASTTraverser instance
     * @param {Object} hydra - The Hydra instance used for accessing transform definitions and source/output references
     */
    constructor(hydra) {
        this.hydra = hydra;
    }

    /**
     * Extracts the function name and starting position from an AST node within a method chain.
     * Handles both standalone function calls and method chains.
     * 
     * Examples of supported patterns:
     * - Standalone: osc(10)
     * - Method chain: osc(10).color(1,1).out()
     * - Nested: solid(1).add(osc(10), 0.5)
     * 
     * @param {Object} node - The current AST node being analyzed
     * @param {Array<Object>} parents - Array of parent nodes in the AST, from root to immediate parent
     * @returns {Object|null} Function information containing:
     *   @returns {string} .name - The name of the function
     *   @returns {number} .startCh - Starting character position of the function
     * @private
     */
    _getFunctionNameFromAST(node, parents) {
        // For nested calls like solid(1).add(osc(10)), we want osc not solid
        // Find the innermost CallExpression that contains our node
        let targetCallExpr = null;

        // First, find the CallExpression that directly contains our node
        for (let i = parents.length - 1; i >= 0; i--) {
            const parent = parents[i];
            if (parent.type === 'CallExpression') {
                // Check if this call expression contains our node in its arguments
                const containsNode = parent.arguments.some(arg => {
                    // Direct match
                    if (arg === node) return true;
                    // Match through UnaryExpression (for negative numbers)
                    if (arg.type === 'UnaryExpression' && arg.argument === node) return true;
                    return false;
                });

                if (containsNode) {
                    targetCallExpr = parent;
                    break;
                }
            }
        }

        if (!targetCallExpr) return null;

        // Get the function name from the target call expression
        if (targetCallExpr.callee.type === 'Identifier') {
            return {
                name: targetCallExpr.callee.name,
                startCh: targetCallExpr.callee.loc.start.column
            };
        }
        if (targetCallExpr.callee.type === 'MemberExpression') {
            return {
                name: targetCallExpr.callee.property.name,
                startCh: targetCallExpr.callee.property.loc.start.column
            };
        }

        return null;
    }

    /**
     * Determines the parameter index of a node within its parent function call.
     * For example, in color(1, 0.5, 1), the '0.5' value has parameter index 1.
     * 
     * @param {Object} node - The current AST node (typically a Literal or Identifier)
     * @param {Array<Object>} parents - Array of parent nodes in the AST
     * @returns {number} Zero-based index of the parameter, or total parameter count if node isn't a parameter
     * @private
     */
    _getParameterCount(node, parents) {
        const parent = parents[parents.length - 1];
        if (!parent || parent.type !== 'CallExpression') return 0;

        const paramIndex = parent.arguments.findIndex(arg => arg === node);
        return paramIndex === -1 ? parent.arguments.length : paramIndex;
    }

    /**
     * Traverses an AST to find all numeric values, source references, and output references.
     * For each value found, collects detailed metadata including:
     * - Value and its type (number, source, output)
     * - Position in code (line, column, length)
     * - Containing function and parameter information
     * - Parameter metadata from Hydra transform definitions
     * 
     * @param {Object} ast - The AST to traverse
     * @param {string} code - Original source code (used for position information)
     * @returns {Array<Object>} Array of value matches, each containing:
     *   @returns {number|string} .value - The actual value found
     *   @returns {number} .lineNumber - Zero-based line number
     *   @returns {number} .ch - Character position in line
     *   @returns {number} .length - Length of the value in characters
     *   @returns {number} .index - Sequential index of the value
     *   @returns {string} .functionName - Name of the containing function
     *   @returns {number} .functionStartCh - Starting character of the function
     *   @returns {number} .parameterIndex - Position in function parameters
     *   @returns {string} .paramName - Parameter name from transform definition
     *   @returns {string} .paramType - Parameter type from transform definition
     *   @returns {*} .paramDefault - Default value from transform definition
     *   @returns {'number'|'source'|'output'} .type - Type of value found
     *   @returns {string[]} [.options] - Available options for source/output references
     */
    findValues(ast, code) {
        if (!ast || !code) return [];

        const matches = [];
        let currentIndex = 0;

        try {
            // Get available sources and outputs from hydra
            const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label || `o${i}`);
            const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label || `s${i}`);

            // Bind the instance methods we need in the traveler
            const getFunctionName = this._getFunctionNameFromAST.bind(this);
            const getParamCount = this._getParameterCount.bind(this);
            const hydra = this.hydra;

            const traveler = makeTraveler({
                /**
                 * Main traversal function that processes each node in the AST.
                 * Handles both numeric literals and source/output identifiers.
                 * 
                 * @param {Object} node - Current AST node
                 * @param {Object} state - Traversal state containing parents array and hydra instance
                 */
                go: function(node, state) {
                    if (!node || typeof node !== 'object') return;

                    // Handle numeric literals
                    if (node.type === 'Literal' && typeof node.value === 'number') {
                        const line = code.split('\n')[node.loc?.start?.line - 1];
                        // Skip if line contains loadScript or await loadScript
                        if (!line?.includes('loadScript') && !line?.includes('await loadScript')) {
                            const lineStart = (node.loc?.start?.line ?? 1) - 1;
                            
                            // Try to get function name from AST first
                            let functionInfo = getFunctionName(node, state.parents || []);
                            let paramCount = getParamCount(node, state.parents || []);

                            // Fall back to regex if AST method fails
                            if (!functionInfo && line) {
                                const beforeContent = line.substring(0, node.loc?.start?.column ?? 0);
                                const name = extractFunctionNameFromCode(beforeContent);
                                if (name) {
                                    functionInfo = {
                                        name,
                                        startCh: beforeContent.lastIndexOf(name)
                                    };
                                }
                                if (!paramCount) {
                                    const lastDotIndex = beforeContent.lastIndexOf('.');
                                    if (lastDotIndex !== -1) {
                                        const afterFunction = beforeContent.slice(lastDotIndex + 1);
                                        paramCount = countParametersBeforePosition(afterFunction);
                                    }
                                }
                            }

                            // Only add if we found a valid function context
                            if (functionInfo) {
                                // Get transform info for parameter name
                                const transform = state.hydra?.generator?.glslTransforms?.[functionInfo.name];
                                const paramInfo = transform?.inputs?.[paramCount];
                                const paramName = paramInfo?.name || `val${paramCount + 1}`;
                                const paramType = paramInfo?.type;
                                const paramDefault = paramInfo?.default;

                                // Check for unary minus operator
                                let value = node.value;
                                let startColumn = node.loc?.start?.column ?? 0;
                                let length = (node.loc?.end?.column ?? 0) - startColumn;
                                
                                // If there's a unary minus before this number
                                const parent = state.parents[state.parents.length - 1];
                                if (parent?.type === 'UnaryExpression' && parent.operator === '-') {
                                    value = -value;
                                    startColumn = parent.loc?.start?.column ?? 0;
                                    length = (parent.loc?.end?.column ?? 0) - startColumn;
                                }

                                matches.push({
                                    value,
                                    lineNumber: lineStart,
                                    ch: startColumn,
                                    length,
                                    index: currentIndex++,
                                    functionName: functionInfo.name,
                                    functionStartCh: functionInfo.startCh,
                                    parameterIndex: paramCount,
                                    paramName,
                                    paramType,
                                    paramDefault,
                                    type: 'number'
                                });
                            }
                        }
                    }
                    // Handle source/output references
                    else if (node.type === 'Identifier') {
                        const name = node.name;
                        const isOutput = availableOutputs.includes(name);
                        const isSource = availableSources.includes(name);
                        
                        if (isOutput || isSource) {
                            const lineStart = node.loc.start.line - 1;
                            const line = code.split('\n')[lineStart];
                            
                            // Try to get function name from AST first
                            let functionInfo = getFunctionName(node, state.parents || []);
                            let paramCount = getParamCount(node, state.parents || []);

                            // Fall back to regex if AST method fails
                            if (!functionInfo && line) {
                                const beforeContent = line.substring(0, node.loc.start.column);
                                const name = extractFunctionNameFromCode(beforeContent);
                                if (name) {
                                    functionInfo = {
                                        name,
                                        startCh: beforeContent.lastIndexOf(name)
                                    };
                                }
                                if (!paramCount) {
                                    const lastDotIndex = beforeContent.lastIndexOf('.');
                                    if (lastDotIndex !== -1) {
                                        const afterFunction = beforeContent.slice(lastDotIndex + 1);
                                        paramCount = countParametersBeforePosition(afterFunction);
                                    }
                                }
                            }

                            // Get transform info for parameter name
                            const transform = state.hydra?.generator?.glslTransforms?.[functionInfo?.name];
                            const paramInfo = transform?.inputs?.[paramCount];
                            const paramName = paramInfo?.name || `val${paramCount + 1}`;
                            const paramType = paramInfo?.type;
                            const paramDefault = paramInfo?.default;

                            matches.push({
                                value: name,
                                lineNumber: lineStart,
                                ch: node.loc.start.column,
                                length: node.loc.end.column - node.loc.start.column,
                                index: currentIndex++,
                                functionName: functionInfo?.name,
                                functionStartCh: functionInfo?.startCh,
                                parameterIndex: paramCount,
                                paramName,
                                paramType,
                                paramDefault,
                                type: isOutput ? 'output' : 'source',
                                options: isOutput ? availableOutputs : availableSources
                            });
                        }
                    }
                    
                    const oldParents = state.parents || [];
                    state.parents = [...oldParents, node];
                    this.super.go.call(this, node, state);
                    state.parents = oldParents;
                }
            });

            traveler.go(ast, { parents: [], hydra });
        } catch (error) {
            Logger.error('Error finding values:', error);
        }

        return matches;
    }
} 