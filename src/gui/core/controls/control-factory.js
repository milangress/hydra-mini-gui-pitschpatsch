import { NumberControl } from './number-control.js';
import { PointControl } from './point-control.js';
import { ColorControl } from './color-control.js';
import { ParameterGroupDetector } from '../../utils/parameter-group-detector.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Factory for creating controls based on parameter types
 */
export class ControlFactory {
    /**
     * Available control types
     * @type {typeof import('./base-control.js').BaseControl[]}
     */
    static controls = [
        NumberControl,
        PointControl,
        ColorControl
    ];

    /**
     * Creates controls for a set of parameters
     * @param {Object} folder - The folder to add controls to
     * @param {import('../types/controls.js').ControlParameter[]} params - The parameters to create controls for
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {Map<string, import('../types/controls.js').ControlBinding>}
     */
    static createControls(folder, params, tweakpaneAdapter) {
        const controls = new Map();
        const groups = ParameterGroupDetector.detectGroups(params);

        groups.forEach(group => {
            const bindings = this.createControlForGroup(group, folder, tweakpaneAdapter);
            for (const [key, binding] of bindings) {
                controls.set(key, binding);
            }
        });

        return controls;
    }

    /**
     * Creates a control for a parameter group
     * @private
     */
    static createControlForGroup(group, folder, tweakpaneAdapter) {
        const bindings = new Map();
        const param = group.params[0];
        
        Logger.log('ControlFactory createControlForGroup - group:', group);
        Logger.log('ControlFactory createControlForGroup - param:', param);
        
        const config = {
            name: param.paramName,
            value: param.value,
            defaultValue: param.paramDefault,
            parameter: param,
            options: {
                label: group.metadata.label ?? param.paramName
            }
        };

        let control;
        switch (group.type) {
            case 'color':
                control = new ColorControl(config);
                break;
            case 'point':
                control = new PointControl(config);
                break;
            default:
                control = new NumberControl(config);
        }

        const controlBindings = control.createBinding(folder, tweakpaneAdapter);
        Logger.log('ControlFactory createControlForGroup - controlBindings:', controlBindings);
        
        if (Array.isArray(controlBindings)) {
            controlBindings.forEach((binding, i) => {
                const paramIndex = group.params[i]?.index;
                Logger.log(`ControlFactory binding array [${i}] - paramIndex:`, paramIndex);
                if (paramIndex !== undefined) {
                    binding.parameter = group.params[i];
                    Logger.log(`ControlFactory binding array [${i}] - parameter:`, binding.parameter);
                    bindings.set(`value${paramIndex}`, binding);
                }
            });
        } else {
            controlBindings.parameter = param;
            Logger.log('ControlFactory single binding - parameter:', controlBindings.parameter);
            Logger.log('ControlFactory single binding - setting key:', `value${param.index}`);
            bindings.set(`value${param.index}`, controlBindings);
        }

        return bindings;
    }

    /**
     * Finds the appropriate control class for a parameter
     * @param {import('../types/controls.js').ControlParameter} param 
     * @returns {typeof import('./base-control.js').BaseControl | undefined}
     */
    static findControlClass(param) {
        return this.controls.find(control => control.canHandle(param));
    }

    /**
     * Registers a new control type
     * @param {typeof import('./base-control.js').BaseControl} ControlClass 
     */
    static registerControl(ControlClass) {
        if (!this.controls.includes(ControlClass)) {
            this.controls.push(ControlClass);
        }
    }
} 