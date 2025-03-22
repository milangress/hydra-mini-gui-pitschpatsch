import { makeTraveler } from 'astravel';
import { Node, CallExpression, Identifier, MemberExpression, Literal, UnaryExpression } from 'acorn';
import { extractFunctionNameFromCode, countParametersBeforePosition } from '../../utils/code-utils';
import { HydraInstance, FunctionInfo, ValuePosition, ValueMatch, TraversalState } from './types';

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
    private hydra: HydraInstance;

    /**
     * Creates a new ASTTraverser instance
     * @param hydra - The Hydra instance used for accessing transform definitions and source/output references
     */
    constructor(hydra: HydraInstance) {
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
     */
    private _getFunctionNameFromAST(node: Node, parents: Node[]): FunctionInfo | null {
        // For nested calls like solid(1).add(osc(10)), we want osc not solid
        // Find the innermost CallExpression that contains our node
        let targetCallExpr: CallExpression | null = null;

        // First, find the CallExpression that directly contains our node
        for (let i = parents.length - 1; i >= 0; i--) {
            const parent = parents[i];
            if (parent.type === 'CallExpression') {
                // Check if this call expression contains our node in its arguments
                const containsNode = (parent as CallExpression).arguments.some(arg => {
                    // Direct match
                    if (arg === node) return true;
                    // Match through UnaryExpression (for negative numbers)
                    if (arg.type === 'UnaryExpression' && arg.argument === node) return true;
                    return false;
                });

                if (containsNode) {
                    targetCallExpr = parent as CallExpression;
                    break;
                }
            }
        }

        if (!targetCallExpr) return null;

        // Get the function name from the target call expression
        if (targetCallExpr.callee.type === 'Identifier') {
            return {
                name: (targetCallExpr.callee as Identifier).name,
                startCh: targetCallExpr.callee.loc?.start.column ?? 0
            };
        }
        if (targetCallExpr.callee.type === 'MemberExpression') {
            const memberExpr = targetCallExpr.callee as MemberExpression;
            const property = memberExpr.property as Identifier;
            return {
                name: property.name,
                startCh: property.loc?.start.column ?? 0
            };
        }

        return null;
    }

    /**
     * Determines the parameter index of a node within its parent function call.
     * For example, in color(1, 0.5, 1), the '0.5' value has parameter index 1.
     */
    private _getParameterCount(node: Node, parents: Node[]): number {
        const parent = parents[parents.length - 1];
        if (!parent || parent.type !== 'CallExpression') return 0;

        const callExpr = parent as CallExpression;
        const paramIndex = callExpr.arguments.findIndex(arg => arg === node);
        return paramIndex === -1 ? callExpr.arguments.length : paramIndex;
    }

    /**
     * Generate a unique key for a value based on its context in the code.
     * Includes function name, parameter name, and position information to ensure uniqueness.
     * 
     * Examples:
     * - osc(10, 0.5) -> osc_freq_line1_pos3_value, osc_sync_line1_pos7_value
     * - osc(10).rotate(6.22) -> osc_freq_line1_pos3_value, rotate_angle_line1_pos12_value
     */
    private _generateKey(valuePosition: ValuePosition): string {
        const paramPart = valuePosition.paramName ? 
            `_${valuePosition.paramName}` : 
            `_param${valuePosition.parameterIndex}`;
            
        return `${valuePosition.functionName}${paramPart}_line${valuePosition.lineNumber}_pos${valuePosition.ch}_value`;
    }

    /**
     * Traverses an AST to find all numeric values, source references, and output references.
     * For each value found, collects detailed metadata including:
     * - Value and its type (number, source, output)
     * - Position in code (line, column, length)
     * - Containing function and parameter information
     * - Parameter metadata from Hydra transform definitions
     */
    findValues(ast: Node | null, code: string | null): ValueMatch[] {
        if (!ast || !code) return [];

        const matches: ValueMatch[] = [];
        let currentIndex = 0;

        try {
            // Get available sources and outputs from hydra
            const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label ?? `o${i}`);
            const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label ?? `s${i}`);

            // Bind the instance methods we need in the traveler
            const getFunctionName = this._getFunctionNameFromAST.bind(this);
            const getParamCount = this._getParameterCount.bind(this);
            const generateKey = this._generateKey.bind(this);
            const hydra = this.hydra;

            const traveler = makeTraveler({
                go: function(node: Node, state: TraversalState) {
                    if (!node || typeof node !== 'object') return;

                    // Handle numeric literals
                    if (node.type === 'Literal' && typeof (node as Literal).value === 'number') {
                        const line = code.split('\n')[(node.loc?.start.line ?? 1) - 1];
                        // Skip if line contains loadScript or await loadScript
                        if (!line?.includes('loadScript') && !line?.includes('await loadScript')) {
                            const lineStart = (node.loc?.start.line ?? 1) - 1;
                            
                            // Try to get function name from AST first
                            let functionInfo = getFunctionName(node, state.parents ?? []);
                            let paramCount = getParamCount(node, state.parents ?? []);

                            // Fall back to regex if AST method fails
                            if (!functionInfo && line) {
                                const beforeContent = line.substring(0, node.loc?.start.column ?? 0);
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
                                const paramName = paramInfo?.name ?? `val${paramCount + 1}`;
                                const paramType = paramInfo?.type;
                                const paramDefault = paramInfo?.default;

                                // Check for unary minus operator
                                let value = (node as Literal).value as number;
                                let startColumn = node.loc?.start.column ?? 0;
                                let length = (node.loc?.end.column ?? 0) - startColumn;
                                
                                // If there's a unary minus before this number
                                const parent = state.parents[state.parents.length - 1];
                                if (parent?.type === 'UnaryExpression' && (parent as UnaryExpression).operator === '-') {
                                    value = -value;
                                    startColumn = parent.loc?.start.column ?? 0;
                                    length = (parent.loc?.end.column ?? 0) - startColumn;
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
                                    type: 'number',
                                    key: generateKey({
                                        functionName: functionInfo.name,
                                        paramName,
                                        lineNumber: lineStart,
                                        ch: startColumn,
                                        parameterIndex: paramCount
                                    })
                                });
                            }
                        }
                    }

                    // Traverse children
                    for (const key in node) {
                        const child = (node as any)[key];
                        if (child && typeof child === 'object') {
                            const newParents = [...state.parents, node];
                            this.go(child, { ...state, parents: newParents });
                        }
                    }
                }
            });

            // Start traversal with initial state
            traveler.go(ast, { parents: [], hydra });

        } catch (error) {
            console.error('Error traversing AST:', error);
        }

        return matches;
    }
} 