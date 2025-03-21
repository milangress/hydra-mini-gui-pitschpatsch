import type { HydraParameter } from '../../../editor/ast/types';

interface BaseParameterGroup {
    params: HydraParameter[];
    metadata: {
        label?: string;
        pattern?: string;
    };
}

export interface ColorGroup extends BaseParameterGroup {
    type: 'color';
    metadata: {
        pattern: 'rgb';
        label?: string;
    };
}

export interface PointGroup extends BaseParameterGroup {
    type: 'point';
    metadata: {
        pattern: 'xy' | 'mult' | 'speed';
        label: string;
    };
}

export interface NumberGroup extends BaseParameterGroup {
    type: 'number';
    metadata: {
        label: string;
    };
}

export type ParameterGroup = ColorGroup | PointGroup | NumberGroup; 