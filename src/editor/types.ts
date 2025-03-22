import { Node, CallExpression, MemberExpression, Program, Literal, Identifier } from 'acorn';
import { Generator, State } from 'astring';
import { HydraInstance } from './ast/types';

export interface CodePosition {
    value: number | string;
    start: number;
    end: number;
    text: string;
}

export interface CodeStructure {
    lines: string[];
    numbers: CodePosition[];
    identifiers: CodePosition[];
    format: string;
    indentation: Map<number, string>;
    lineBreaks: Map<number, string>;
    dotOperators: Map<number, number[]>;
}

export interface FormattingState extends State {
    write: (text: string) => void;
}

export interface CustomGenerator extends Generator {
    _currentLine: number;
    _formatNumber: (num: number) => string;
    _validIdentifiers: string[];
    _valueMap: Map<number, number | string>;
    [key: string]: any;
}

export interface CodeMirrorPosition {
    line: number;
    ch: number;
}

export interface CodeMirrorRange {
    start: CodeMirrorPosition;
    end: CodeMirrorPosition;
}

export interface CodeMirrorEditor {
    startOperation: () => void;
    endOperation: () => void;
    replaceRange: (text: string, from: CodeMirrorPosition, to: CodeMirrorPosition) => void;
    getRange: (from: CodeMirrorPosition, to: CodeMirrorPosition) => string;
}

declare global {
    interface Window {
        cm?: CodeMirrorEditor;
    }
} 