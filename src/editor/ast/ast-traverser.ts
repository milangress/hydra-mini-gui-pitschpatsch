import { makeTraveler } from 'astravel';
import type { Node, CallExpression, Identifier, MemberExpression, Literal, UnaryExpression } from 'acorn';
import { extractFunctionNameFromCode, countParametersBeforePosition } from '../../utils/code-utils';
import type { HydraInstance, FunctionInfo, HydraParameter, TraversalState } from './types';
import { HydraKeyGenerationError, HydraTraversalError } from './ast-errors';
import { generateKey, generateFunctionId, getNodeLine, shouldSkipLine, isNumericLiteral, isIdentifier } from './ast-utils';

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
    private currentIndex = 0;
    private availableOutputs: string[];
    private availableSources: string[];
    private code: string | null = null;
    private matches: HydraParameter[] = [];

    /**
     * Creates a new ASTTraverser instance
     * @param hydra - The Hydra instance used for accessing transform definitions and source/output references
     */
    constructor(hydra: HydraInstance) {
        this.hydra = hydra;
        this.availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label ?? `o${i}`);
        this.availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label ?? `s${i}`);
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
        const paramIndex = callExpr.arguments.findIndex(arg => {
            // Direct match
            if (arg === node) return true;
            // Match through UnaryExpression (for negative numbers)
            if (arg.type === 'UnaryExpression' && arg.argument === node) return true;
            return false;
        });
        return paramIndex === -1 ? callExpr.arguments.length : paramIndex;
    }

    /**
     * Traverses an AST to find all numeric values, source references, and output references.
     * For each value found, collects detailed metadata including:
     * - Value and its type (number, source, output)
     * - Position in code (line, column, length)
     * - Containing function and parameter information
     * - Parameter metadata from Hydra transform definitions
     */
    findValues(ast: Node | null, code: string | null): HydraParameter[] {
        if (!ast || !code) return [];

        this.code = code;
        this.matches = [];

        try {
            const traveler = makeTraveler({
                // Handle numeric literals
                Literal: (node: Node, state: TraversalState) => {
                    if (!isNumericLiteral(node)) return;
                    
                    const line = getNodeLine(node, this.code!);
                    if (shouldSkipLine(line)) return;

                    try {
                        this.processNumericLiteral(node as Literal, state, line ?? '');
                    } catch (error) {
                        this.handleNodeError(error, node, 'numeric literal');
                    }
                },

                // Handle identifiers (sources and outputs)
                Identifier: (node: Node, state: TraversalState) => {
                    const line = getNodeLine(node, this.code!);
                    if (shouldSkipLine(line)) return;

                    try {
                        this.processIdentifier(node as Identifier, state, line ?? '');
                    } catch (error) {
                        this.handleNodeError(error, node, 'identifier');
                    }
                }
            });

            traveler.go(ast, { parents: [], hydra: this.hydra });
        } catch (error) {
            this.handleTraversalError(error, ast);
        }

        return this.matches;
    }

    private handleNodeError(error: unknown, node: Node, context: string) {
        if (error instanceof HydraKeyGenerationError) {
            console.error('Key generation failed:', error.message, 'Context:', error.context);
        } else {
            const nodeLocation = node.loc ? 
                `at line ${node.loc.start.line}, column ${node.loc.start.column}` : 
                'at unknown location';
            
            throw new HydraTraversalError(
                `Error processing ${context} ${nodeLocation}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                node
            );
        }
    }

    private handleTraversalError(error: unknown, ast: Node) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorContext = {
            nodeType: ast.type,
            location: ast.loc ? 
                `line ${ast.loc.start.line}, column ${ast.loc.start.column}` : 
                'unknown location'
        };

        console.error('AST Traversal failed:', errorMessage, 'Context:', errorContext);
    }

    private processNumericLiteral(node: Literal, state: TraversalState, line: string) {
        const lineStart = (node.loc?.start.line ?? 1) - 1;
        const parent = state.parents[state.parents.length - 1];
        const nodeToUse = parent?.type === 'UnaryExpression' ? parent : node;
        
        const { functionInfo, paramCount, parameterIndex } = this.getNodeContext(nodeToUse, state, line);
        if (!functionInfo) return;

        let value = node.value as number;
        let startColumn = node.loc?.start.column ?? 0;
        let length = (node.loc?.end.column ?? 0) - startColumn;

        if (parent?.type === 'UnaryExpression' && (parent as UnaryExpression).operator === '-') {
            value = -value;
            startColumn = parent.loc?.start.column ?? 0;
            length = (parent.loc?.end.column ?? 0) - startColumn;
        }

        this.matches.push({
            ...this.createBaseParameter(node, functionInfo, paramCount, lineStart, parameterIndex),
            value,
            ch: startColumn,
            length,
            type: 'number'
        } as HydraParameter);
    }

    private processIdentifier(node: Identifier, state: TraversalState, line: string) {
        const name = node.name;
        const isOutput = this.availableOutputs.includes(name);
        const isSource = this.availableSources.includes(name);
        
        if (!isOutput && !isSource) return;

        const lineStart = (node.loc?.start.line ?? 1) - 1;
        const { functionInfo, paramCount, parameterIndex } = this.getNodeContext(node, state, line);
        if (!functionInfo) return;

        this.matches.push({
            ...this.createBaseParameter(node, functionInfo, paramCount, lineStart, parameterIndex),
            value: name,
            type: isOutput ? 'output' : 'source',
            options: isOutput ? this.availableOutputs : this.availableSources
        } as HydraParameter);
    }

    private getNodeContext(node: Node, state: TraversalState, line: string): {
        functionInfo: FunctionInfo | null;
        paramCount: number;
        parameterIndex: number;
    } {
        // Try AST-based extraction first
        let functionInfo = this._getFunctionNameFromAST(node, state.parents ?? []);
        let parameterIndex = this._getParameterCount(node, state.parents ?? []);
        let paramCount = parameterIndex;

        // Fall back to regex-based extraction if needed
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

        return { functionInfo, paramCount, parameterIndex };
    }

    private getParamMetadata(functionName: string, parameterIndex: number) {
        const transform = this.hydra?.generator?.glslTransforms?.[functionName];
        const paramInfo = transform?.inputs?.[parameterIndex];
        return {
            name: paramInfo?.name ?? `val${parameterIndex + 1}`,
            type: paramInfo?.type ?? 'number',
            default: paramInfo?.default
        };
    }

    private createBaseParameter(
        node: Node,
        functionInfo: FunctionInfo,
        paramCount: number,
        lineStart: number,
        parameterIndex: number
    ): Partial<HydraParameter> {
        const paramMeta = this.getParamMetadata(functionInfo.name, parameterIndex);
        
        return {
            lineNumber: lineStart,
            ch: node.loc?.start.column ?? 0,
            length: (node.loc?.end.column ?? 0) - (node.loc?.start.column ?? 0),
            index: this.currentIndex++,
            functionName: functionInfo.name,
            functionStartCh: functionInfo.startCh,
            parameterIndex,
            paramName: paramMeta.name,
            paramType: paramMeta.type,
            paramDefault: paramMeta.default,
            paramCount,
            key: generateKey({
                functionName: functionInfo.name,
                paramName: paramMeta.name,
                lineNumber: lineStart,
                ch: node.loc?.start.column ?? 0,
                parameterIndex
            }),
            functionId: generateFunctionId({
                functionName: functionInfo.name,
                lineNumber: lineStart,
                ch: functionInfo.startCh,
                parameterIndex: undefined // Don't include parameter info in function ID
            })
        };
    }
} 