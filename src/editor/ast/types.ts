import { Node, CallExpression, Identifier, MemberExpression, Literal, UnaryExpression } from 'acorn';

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
}

export interface ValuePosition {
    functionName: string;
    paramName: string;
    lineNumber: number;
    ch: number;
    parameterIndex?: number;
}

export interface FunctionInfo {
    name: string;
    startCh: number;
}

export interface ValueMatch {
    value: number | string;
    lineNumber: number;
    ch: number;
    length: number;
    index: number;
    functionName: string;
    functionStartCh: number;
    parameterIndex: number;
    paramName: string;
    paramType?: string;
    paramDefault?: any;
    type: 'number' | 'source' | 'output';
    key: string;
    options?: string[];
}

export interface TraversalState {
    parents: Node[];
    hydra: HydraInstance;
} 