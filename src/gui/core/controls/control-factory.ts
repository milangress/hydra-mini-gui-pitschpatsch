import { NumberControl } from './number-control';
import { PointControl } from './point-control';
import { ColorControl } from './color-control';
import { ParameterGroupDetector } from '../../utils/parameter-group-detector';
import { Logger } from '../../../utils/logger';
import { BaseControl } from './base-control';
import { ControlParameter } from '../types/controls';
import { ParameterGroup } from '../types/parameter-groups';

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
    static createControls(folder: any, params: ControlParameter[], tweakpaneAdapter: any) {
        const groups = ParameterGroupDetector.detectGroups(params);

        groups.forEach(group => {
            this.createControlForGroup(group, folder, tweakpaneAdapter);
        });
    }

    /**
     * Creates a single non-group control (like NumberControl)
     */
    private static createSingleControl(param: ControlParameter, folder: any, tweakpaneAdapter: any) {
        const config = {
            name: param.paramName,
            options: { label: param.paramName },
            value: param.value,
            defaultValue: param.paramDefault,
            parameter: param
        };

        new NumberControl(config);
    }

    /**
     * Creates a group control (like ColorControl or PointControl)
     */
    private static createGroupControl(group: ParameterGroup, folder: any, tweakpaneAdapter: any) {
        const config = {
            name: group.params.map(p => p.paramName).join(''),
            options: {
                label: group.metadata.label ?? group.params[0].paramName
            },
            params: group.params
        };

        group.type === 'color' 
            ? new ColorControl(config as any) 
            : new PointControl(config as any);

    }

    /**
     * Creates a control for a parameter group
     */
    static createControlForGroup(group: ParameterGroup, folder: any, tweakpaneAdapter: any) {
        Logger.log('ControlFactory createControlForGroup - group:', group);
        
        if (group.type === 'color' || group.type === 'point') {
            this.createGroupControl(group, folder, tweakpaneAdapter);
        } else {
            this.createSingleControl(group.params[0], folder, tweakpaneAdapter);
        }
    }

    /**
     * Finds the appropriate control class for a parameter
     */
    static findControlClass(param: ControlParameter): ControlClass | undefined {
        return this.controls.find(control => control.canHandle(param));
    }

    /**
     * Registers a new control type
     */
    static registerControl(ControlClass: ControlClass): void {
        if (!this.controls.includes(ControlClass)) {
            this.controls.push(ControlClass);
        }
    }
} 