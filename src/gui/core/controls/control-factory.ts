import { NumberControl } from './number-control';
import { PointControl } from './point-control';
import { ColorControl } from './color-control';
import { ParameterGroupDetector } from '../../utils/parameter-group-detector';
import { Logger } from '../../../utils/logger';
import { BaseControl } from './base-control';
import { ControlParameter } from '../types/controls';
import { ParameterGroup } from '../types/parameter-groups';
import { TweakpaneAdapter } from '../../adapters/tweakpane-adapter';
import { TweakpaneFolder } from '../../adapters/types';

type ControlClass = typeof BaseControl;

/**
 * Factory for creating controls based on parameter types
 */
export class ControlFactory {
    /**
     * Available control types
     */
    static controls: ControlClass[] = [
        NumberControl,
        PointControl,
        ColorControl
    ];

    /**
     * Creates controls for a set of parameters
     */
    static createControls(
        folder: TweakpaneFolder, 
        params: ControlParameter[], 
        tweakpaneAdapter: TweakpaneAdapter
    ): void {
        const groups = ParameterGroupDetector.detectGroups(params);

        groups.forEach(group => {
            this.createControlForGroup(group, folder, tweakpaneAdapter);
        });
    }

    /**
     * Creates a single non-group control (like NumberControl)
     */
    private static createSingleControl(
        param: ControlParameter, 
        folder: TweakpaneFolder, 
        tweakpaneAdapter: TweakpaneAdapter
    ): void {
        const config = {
            name: param.paramName,
            options: { label: param.paramName },
            value: param.value,
            defaultValue: param.paramDefault,
            parameter: param
        };

        const control = new NumberControl(config);
        control.createBinding(folder, tweakpaneAdapter);
    }

    /**
     * Creates a group control (like ColorControl or PointControl)
     */
    private static createGroupControl(
        group: ParameterGroup, 
        folder: TweakpaneFolder, 
        tweakpaneAdapter: TweakpaneAdapter
    ): void {
        const config = {
            name: group.params.map(p => p.paramName).join(''),
            options: {
                label: group.metadata.label ?? group.params[0].paramName
            },
            params: group.params
        };

        const control = group.type === 'color' 
            ? new ColorControl(config as any) 
            : new PointControl(config as any);
        control.createBinding(folder, tweakpaneAdapter);
    }

    /**
     * Creates a control for a parameter group
     */
    static createControlForGroup(
        group: ParameterGroup, 
        folder: TweakpaneFolder, 
        tweakpaneAdapter: TweakpaneAdapter
    ): void {
        Logger.log('ControlFactory createControlForGroup - group:', group);
        
        if (group.type === 'color' || group.type === 'point') {
            this.createGroupControl(group, folder, tweakpaneAdapter);
        } else {
            this.createSingleControl(group.params[0], folder, tweakpaneAdapter);
        }
    }
    
} 