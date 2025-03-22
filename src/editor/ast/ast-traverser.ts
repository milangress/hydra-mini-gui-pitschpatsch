import { makeTraveler } from 'astravel';
import type { Node, CallExpression, Identifier, MemberExpression, Literal, UnaryExpression } from 'acorn';
import { extractFunctionNameFromCode, countParametersBeforePosition } from '../../utils/code-utils';
import type { HydraInstance, FunctionInfo, HydraParameter, TraversalState } from './types';

class HydraTraversalError extends Error {
    constructor(message: string, public node?: Node) {
        super(message);
        this.name = 'HydraTraversalError';
    }
}

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
    private _generateKey(params: Partial<HydraParameter>): string {
        const paramPart = params.paramName ?? `param${params.parameterIndex}`;
        const functionName = params.functionName ?? 'unknown';
        const lineNumber = params.lineNumber ?? 0;
        const ch = params.ch ?? 0;
        return `${functionName}_${paramPart}_line${lineNumber}_pos${ch}_value`;
    }

    private _generateFunctionId(params: Partial<HydraParameter>): string {
        const position = params.functionStartCh ?? params.ch ?? 0;
        const functionName = params.functionName ?? 'unknown';
        const lineNumber = params.lineNumber ?? 0;
        return `${functionName}_line${lineNumber}_pos${position}`;
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

        const matches: HydraParameter[] = [];
        try {
            const traveler = makeTraveler({
                go: function(this: any, node: Node, state: TraversalState) {
                    if (!this.isValidNode(node)) return;
                    
                    try {
                        this.processNode(node, state, matches, code);
                    } catch (error) {
                        throw new HydraTraversalError(
                            error instanceof Error ? error.message : 'Unknown error processing node',
                            node
                        );
                    }

                    // Traverse children with updated parent chain
                    const oldParents = state.parents || [];
                    state.parents = [...oldParents, node];
                    
                    // Use the traveler's built-in traversal
                    if (node.type === 'Program') {
                        // First cast to unknown to avoid type checking, then to the expected shape
                        const program = node as unknown as { body: Node[] };
                        this.go(program.body, state);
                    }
                    else if (Array.isArray(node)) {
                        node.forEach(child => this.go(child, state));
                    }
                    else {
                        const keys = Object.keys(node);
                        for (let i = 0; i < keys.length; i++) {
                            const key = keys[i];
                            const value = (node as any)[key];
                            if (value && typeof value === 'object') {
                                this.go(value, state);
                            }
                        }
                    }
                    
                    state.parents = oldParents;
                }.bind(this)
            });

            traveler.go(ast, { parents: [], hydra: this.hydra });
        } catch (error) {
            if (error instanceof HydraTraversalError) {
                console.error('Error traversing AST:', error.message, 'at node:', error.node);
            } else {
                console.error('Unexpected error during AST traversal:', error);
            }
        }
        return matches;
    }

    private isValidNode(node: Node | null): node is Node {
        return node !== null && typeof node === 'object';
    }

    private processNode(node: Node, state: TraversalState, matches: HydraParameter[], code: string) {
        const line = this.getNodeLine(node, code);
        if (this.shouldSkipLine(line)) return;

        if (this.isNumericLiteral(node)) {
            this.processNumericLiteral(node, state, matches, code, line ?? '');
        } else if (this.isIdentifier(node)) {
            this.processIdentifier(node, state, matches, code, line ?? '');
        }
    }

    private getNodeLine(node: Node, code: string): string | undefined {
        const lineNumber = (node.loc?.start.line ?? 1) - 1;
        return code.split('\n')[lineNumber];
    }

    private shouldSkipLine(line?: string): boolean {
        return !line || line.includes('loadScript') || line.includes('await loadScript');
    }

    private isNumericLiteral(node: Node): node is Literal {
        return node.type === 'Literal' && typeof (node as Literal).value === 'number';
    }

    private isIdentifier(node: Node): node is Identifier {
        return node.type === 'Identifier';
    }

    private getNodeContext(node: Node, state: TraversalState, line: string): {
        functionInfo: FunctionInfo | null;
        paramCount: number;
    } {
        // Try AST-based extraction first
        let functionInfo = this._getFunctionNameFromAST(node, state.parents ?? []);
        let paramCount = this._getParameterCount(node, state.parents ?? []);

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

        return { functionInfo, paramCount: paramCount ?? 0 };
    }

    private getParamMetadata(functionName: string, paramCount: number) {
        const transform = this.hydra?.generator?.glslTransforms?.[functionName];
        const paramInfo = transform?.inputs?.[paramCount];
        return {
            name: paramInfo?.name ?? `val${paramCount + 1}`,
            type: paramInfo?.type ?? 'number',
            default: paramInfo?.default
        };
    }

    private createBaseParameter(
        node: Node,
        functionInfo: FunctionInfo,
        paramCount: number,
        lineStart: number
    ): Partial<HydraParameter> {
        const paramMeta = this.getParamMetadata(functionInfo.name, paramCount);
        
        return {
            lineNumber: lineStart,
            ch: node.loc?.start.column ?? 0,
            length: (node.loc?.end.column ?? 0) - (node.loc?.start.column ?? 0),
            index: this.currentIndex++,
            functionName: functionInfo.name,
            functionStartCh: functionInfo.startCh,
            parameterIndex: paramCount,
            paramName: paramMeta.name,
            paramType: paramMeta.type,
            paramDefault: paramMeta.default,
            paramCount,
            key: this._generateKey({
                functionName: functionInfo.name,
                paramName: paramMeta.name,
                lineNumber: lineStart,
                ch: node.loc?.start.column ?? 0,
                parameterIndex: paramCount
            }),
            functionId: this._generateFunctionId({
                functionName: functionInfo.name,
                lineNumber: lineStart,
                ch: node.loc?.start.column ?? 0,
                parameterIndex: paramCount
            })
        };
    }

    private processNumericLiteral(
        node: Literal,
        state: TraversalState,
        matches: HydraParameter[],
        code: string,
        line: string
    ) {
        const lineStart = (node.loc?.start.line ?? 1) - 1;
        const parent = state.parents[state.parents.length - 1];
        const nodeToUse = parent?.type === 'UnaryExpression' ? parent : node;
        
        const { functionInfo, paramCount } = this.getNodeContext(nodeToUse, state, line);
        if (!functionInfo) return;

        let value = node.value as number;
        let startColumn = node.loc?.start.column ?? 0;
        let length = (node.loc?.end.column ?? 0) - startColumn;

        if (parent?.type === 'UnaryExpression' && (parent as UnaryExpression).operator === '-') {
            value = -value;
            startColumn = parent.loc?.start.column ?? 0;
            length = (parent.loc?.end.column ?? 0) - startColumn;
        }

        matches.push({
            ...this.createBaseParameter(node, functionInfo, paramCount, lineStart),
            value,
            ch: startColumn,
            length,
            type: 'number'
        } as HydraParameter);
    }

    private processIdentifier(
        node: Identifier,
        state: TraversalState,
        matches: HydraParameter[],
        code: string,
        line: string
    ) {
        const name = node.name;
        const isOutput = this.availableOutputs.includes(name);
        const isSource = this.availableSources.includes(name);
        
        if (!isOutput && !isSource) return;

        const lineStart = (node.loc?.start.line ?? 1) - 1;
        const { functionInfo, paramCount } = this.getNodeContext(node, state, line);
        if (!functionInfo) return;

        matches.push({
            ...this.createBaseParameter(node, functionInfo, paramCount, lineStart),
            value: name,
            type: isOutput ? 'output' : 'source',
            options: isOutput ? this.availableOutputs : this.availableSources
        } as HydraParameter);
    }
} 