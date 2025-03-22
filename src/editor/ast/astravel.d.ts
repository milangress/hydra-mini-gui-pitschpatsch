declare module 'astravel' {
    import type { Node } from 'acorn';

    export interface TravelerOptions {
        go?: (node: Node, state: any) => void;
        onEnter?: (node: Node) => void;
        onLeave?: (node: Node) => void;
        [key: string]: any;
    }

    export interface Traveler {
        go: (node: Node, state: any) => void;
        find: (predicate: (node: Node, state: any) => boolean, node: Node, state: any) => { node: Node; state: any } | undefined;
        makeChild: (properties: TravelerOptions) => Traveler;
        super?: Traveler;
        [key: string]: any;
    }

    export function makeTraveler(options: TravelerOptions): Traveler;
    export const defaultTraveler: Traveler;
    export function attachComments(ast: Node, comments: Comment[]): Node;

    export interface Comment {
        type: 'Line' | 'Block';
        value: string;
        start: number;
        end: number;
        loc: {
            start: { line: number; column: number };
            end: { line: number; column: number };
        };
    }
} 