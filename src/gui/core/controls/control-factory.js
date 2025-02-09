import { NumberControl } from './number-control.js';
import { PointControl } from './point-control.js';
import { ColorControl } from './color-control.js';
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
     * @param {Function} onChange - Callback for value changes
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {Map<string, import('../types/controls.js').ControlBinding>}
     */
    static createControls(folder, params, onChange, tweakpaneAdapter) {
        const controls = new Map();

        params.forEach(param => {
            Logger.log('Processing parameter:', param);
            
            const ControlClass = this.findControlClass(param);
            Logger.log('Found control class:', ControlClass?.name);
            
            if (!ControlClass) {
                Logger.log('No control class found for parameter type:', param.paramType);
                return;
            }

            const control = new ControlClass({
                name: `value${param.index}`,
                value: param.value,
                defaultValue: param.paramDefault,
                onChange,
                options: {
                    label: param.paramName
                }
            });

            const bindings = control.createBinding(folder, tweakpaneAdapter);
            if (Array.isArray(bindings)) {
                bindings.forEach((binding, i) => {
                    controls.set(`value${param.index}_${i}`, binding);
                });
            } else {
                controls.set(`value${param.index}`, bindings);
            }
        });

        return controls;
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