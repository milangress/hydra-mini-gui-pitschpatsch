import { TweakpaneAdapter } from '../../adapters/tweakpane-adapter';
import { TweakpaneFolder } from '../../adapters/types';
import { BaseControl } from '../controls/base-control';
import { HydraParameter } from '../../../editor/ast/types';

export interface FunctionGroup {
    displayName: string;
    group: {
        params: HydraParameter[];
    };
}

export interface ControlMap extends Map<string, BaseControl> {} 