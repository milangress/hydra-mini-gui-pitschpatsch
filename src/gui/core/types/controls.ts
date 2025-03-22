import { HydraParameter } from '../../../editor/ast/types';

export interface ControlConfig {
    name: string;
    value: any;
    defaultValue: any;
    options: ControlOptions;
    HydraParameter?: HydraParameter;
    params?: HydraParameter[];
}

export interface BaseControlOptions {
    label?: string;
    readonly?: boolean;
}

export interface NumberControlOptions extends BaseControlOptions {
    min?: number;
    max?: number;
    step?: number;
    type?: 'number' | 'select';
    values?: any[];
    options?: Record<string, any>;
}

export interface PointControlOptions extends BaseControlOptions {
    x: {
        min: number;
        max: number;
        step: number;
    };
    y: {
        min: number;
        max: number;
        step: number;
    };
    mode?: 'normal' | 'centered' | 'extended';
}

export interface ColorControlOptions extends BaseControlOptions {
    type?: 'float' | 'rgb';
    color?: {
        type: 'float' | 'rgb';
    };
}

export type ControlOptions = BaseControlOptions | NumberControlOptions | PointControlOptions | ColorControlOptions;

export interface ControlBinding {
    binding: any; // Tweakpane binding object
    controller: any; // Tweakpane controller
    originalValue: any;
    isColor?: boolean;
    colorComponent?: 'r' | 'g' | 'b';
    isPoint?: boolean;
    pointKey?: string;
    pointComponent?: 'x' | 'y';
    mapPoint?: boolean;
    parameter?: HydraParameter;
}

