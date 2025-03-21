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
        });

        return controls;
    }

    /**
     * Creates a control for a parameter group
     * @private
     */
    static createControlForGroup(group, folder, tweakpaneAdapter) {
        Logger.log('ControlFactory createControlForGroup - group:', group);
        
        const config = {
            name: group.params.map(p => p.paramName).join(''),
            options: {
                label: group.metadata.label ?? group.params[0].paramName
            }
        };

        // For color and point controls, pass all params
        if (group.type === 'color' || group.type === 'point') {
            config.params = group.params;
        } else {
            // For number controls, just pass the single param
            config.value = group.params[0].value;
            config.defaultValue = group.params[0].paramDefault;
            config.parameter = group.params[0];
        }

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
        return controlBindings;
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