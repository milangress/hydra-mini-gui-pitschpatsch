import { TweakpaneAdapter } from '../../adapters/tweakpane-adapter';
import { TweakpaneFolder } from '../../adapters/types';
import { BaseControl } from '../controls/base-control';
import { ValuePosition } from '../../../editor/ast/types';

export interface FunctionGroup {
    displayName: string;
    group: {
        params: ValuePosition[];
    };
}

export interface ControlMap extends Map<string, BaseControl> {} 