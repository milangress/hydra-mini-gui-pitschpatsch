import { makeTraveler } from 'astravel';
import { extractFunctionNameFromCode, countParametersBeforePosition } from '../../utils/code-utils.js';

export class ASTTraverser {
    constructor(hydra) {
        this.hydra = hydra;
    }

    _getFunctionNameFromAST(node, parents) {
        // Find the root of the method chain
        let chainRoot = null;
        let functionStartCh = null;
        for (let i = parents.length - 1; i >= 0; i--) {
            const p = parents[i];
            if (p.type === 'CallExpression') {
                if (p.callee.type === 'Identifier') {
                    chainRoot = p;
                    functionStartCh = p.callee.loc.start.column;
                    break;
                }
                // If we find a member expression that's not part of a method chain, this is our root
                if (p.callee.type === 'MemberExpression' && !p.callee.object.property) {
                    chainRoot = p;
                    functionStartCh = p.callee.property.loc.start.column;
                    break;
                }
            }
        }

        // If we found a chain root, use that for grouping
        if (chainRoot) {
            if (chainRoot.callee.type === 'Identifier') {
                return {
                    name: chainRoot.callee.name,
                    startCh: functionStartCh
                };
            }
            if (chainRoot.callee.type === 'MemberExpression') {
                return {
                    name: chainRoot.callee.property.name,
                    startCh: functionStartCh
                };
            }
        }

        // Fallback to immediate parent if no chain root found
        const parent = parents[parents.length - 1];
        if (!parent) return null;

        if (parent.type === 'CallExpression') {
            if (parent.callee.type === 'Identifier') {
                return {
                    name: parent.callee.name,
                    startCh: parent.callee.loc.start.column
                };
            }
            if (parent.callee.type === 'MemberExpression') {
                return {
                    name: parent.callee.property.name,
                    startCh: parent.callee.property.loc.start.column
                };
            }
        }

        return null;
    }

    _getParameterCount(node, parents) {
        const parent = parents[parents.length - 1];
        if (!parent || parent.type !== 'CallExpression') return 0;

        const paramIndex = parent.arguments.findIndex(arg => arg === node);
        return paramIndex === -1 ? parent.arguments.length : paramIndex;
    }

    findValues(ast, code) {
        const matches = [];
        let currentIndex = 0;

        // Get available sources and outputs from hydra
        const availableOutputs = Array.from({ length: 4 }, (_, i) => this.hydra?.o?.[i]?.label || `o${i}`);
        const availableSources = Array.from({ length: 4 }, (_, i) => this.hydra?.s?.[i]?.label || `s${i}`);

        // Bind the instance methods we need in the traveler
        const getFunctionName = this._getFunctionNameFromAST.bind(this);
        const getParamCount = this._getParameterCount.bind(this);
        const hydra = this.hydra;

        const traveler = makeTraveler({
            go: function(node, state) {
                // Handle numeric literals
                if (node.type === 'Literal' && typeof node.value === 'number') {
                    const line = code.split('\n')[node.loc.start.line - 1];
                    if (!line?.includes('loadScript')) {
                        const lineStart = node.loc.start.line - 1;
                        
                        // Try to get function name from AST first
                        let functionInfo = getFunctionName(node, state.parents);
                        let paramCount = getParamCount(node, state.parents);

                        // Fall back to regex if AST method fails
                        if (!functionInfo) {
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
                            value: node.value,
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
                            type: 'number'
                        });
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
                        let functionInfo = getFunctionName(node, state.parents);
                        let paramCount = getParamCount(node, state.parents);

                        // Fall back to regex if AST method fails
                        if (!functionInfo) {
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
                
                const oldParents = state.parents;
                state.parents = [...oldParents, node];
                this.super.go.call(this, node, state);
                state.parents = oldParents;
            }
        });

        traveler.go(ast, { parents: [], hydra });
        return matches;
    }
} 