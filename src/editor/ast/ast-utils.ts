import {HydraKeyGenerationError} from './ast-errors'
import type { HydraParameter } from './types'
import type { Identifier, Literal, Node } from 'acorn'


/**
     * Generate a unique key for a value based on its context in the code.
     * Includes function name, parameter name, and position information to ensure uniqueness.
     * 
     * Examples:
     * - osc(10, 0.5) -> osc_freq_line1_pos3_value, osc_sync_line1_pos7_value
     * - osc(10).rotate(6.22) -> osc_freq_line1_pos3_value, rotate_angle_line1_pos12_value
     */
export function generateKey(params: Partial<HydraParameter>): string {
    if (!params.functionName) {
        throw new HydraKeyGenerationError('Missing function name', {
            lineNumber: params.lineNumber,
            column: params.ch,
            nodeType: 'value'
        });
    }

    if (params.lineNumber === undefined || params.ch === undefined) {
        throw new HydraKeyGenerationError('Missing position information', {
            functionName: params.functionName,
            paramName: params.paramName
        });
    }

    const paramPart = params.paramName ?? `param${params.parameterIndex}`;
    return `${params.functionName}_${paramPart}_line${params.lineNumber}_pos${params.ch}_value`;
}

export function generateFunctionId(params: Partial<HydraParameter>): string {
    if (!params.functionName) {
        throw new HydraKeyGenerationError('Missing function name', {
            lineNumber: params.lineNumber,
            column: params.ch,
            nodeType: 'function'
        });
    }

    if (params.lineNumber === undefined) {
        throw new HydraKeyGenerationError('Missing line number', {
            functionName: params.functionName,
            column: params.ch
        });
    }

    const position = params.functionStartCh ?? params.ch;
    if (position === undefined) {
        throw new HydraKeyGenerationError('Missing position information', {
            functionName: params.functionName,
            lineNumber: params.lineNumber
        });
    }

    return `${params.functionName}_line${params.lineNumber}_pos${position}`;
}

export function getNodeLine(node: Node, code: string): string | undefined {
    const lineNumber = (node.loc?.start.line ?? 1) - 1;
    return code.split('\n')[lineNumber];
}

export function shouldSkipLine(line?: string): boolean {
    return !line || line.includes('loadScript') || line.includes('await loadScript');
}

export function isNumericLiteral(node: Node): node is Literal {
    return node.type === 'Literal' && typeof (node as Literal).value === 'number';
}

export function isIdentifier(node: Node): node is Identifier {
    return node.type === 'Identifier';
}
