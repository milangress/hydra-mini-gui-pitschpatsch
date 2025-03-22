import type { Node } from 'acorn';

export interface HydraTransformInput {
    name?: string;
    type?: string;
    default?: any;
}

export interface HydraTransform {
    inputs?: HydraTransformInput[];
}

export interface HydraGenerator {
    glslTransforms?: {
        [key: string]: HydraTransform;
    };
}

export interface HydraOutput {
    label?: string;
}

export interface HydraInstance {
    o?: HydraOutput[];
    s?: HydraOutput[];
    generator?: HydraGenerator;
    eval?: (code: string) => void;
}

export interface FunctionInfo {
    name: string;
    startCh: number;
}

/**
 * Unified type for representing a parameter in the Hydra system.
 * Used across the AST parser, editor, and GUI controls.
 */
export interface HydraParameter {
    // Core parameter identification
    functionName: string;
    paramName: string;
    key: string;
    functionId: string;

    // Parameter metadata
    paramType: string;
    paramDefault: any;
    value: any;
    type?: 'number' | 'source' | 'output';
    options?: string[];

    // Position in code
    lineNumber: number;
    ch: number;
    length?: number;
    functionStartCh?: number;

    // Parameter ordering
    index: number;
    parameterIndex: number;
    paramCount: number;
}

export interface TraversalState {
    parents: Node[];
    hydra: HydraInstance;
}