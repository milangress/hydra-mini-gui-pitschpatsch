
import type { Node } from 'acorn'

export class HydraTraversalError extends Error {
    constructor(message: string, public node?: Node) {
        super(message);
        this.name = 'HydraTraversalError';
    }
}

export class HydraKeyGenerationError extends Error {
    constructor(
        message: string,
        public context: {
            functionName?: string;
            lineNumber?: number;
            column?: number;
            paramName?: string;
            nodeType?: string;
        }
    ) {
        super(`Key generation error: ${message} (at ${context.functionName ?? 'unknown'}, line ${context.lineNumber}, col ${context.column})`);
        this.name = 'HydraKeyGenerationError';
    }
}