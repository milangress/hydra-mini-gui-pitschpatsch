import type { BaseControl } from '../controls/base-control';
import type { HydraParameter } from '../../../editor/ast/types';


export interface FunctionGroup {
    displayName: string;
    group: {
        params: HydraParameter[];
    };
}

export interface ControlMap extends Map<string, BaseControl> {} 