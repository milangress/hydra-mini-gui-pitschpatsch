import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Control for color values (r,g,b,a)
 */
export class ColorControl extends BaseControl {
    /**
     * Creates a new color control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
        
        // Set default options for color controls
        this.options = {
            color: { type: 'float' },
            ...this.options
        };
    }

    /**
     * Creates the control binding
     * @param {Object} folder - The folder to add the control to
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {import('../types/controls.js').ControlBinding}
     */
    createBinding(folder, tweakpaneAdapter) {
        const obj = { color: { r: this.value, g: this.value, b: this.value, a: this.value } };
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'color', {
            ...this.options,
            label: this.options.label
        });

        // Create bindings for all color components
        const bindings = ['r', 'g', 'b', 'a'].map(component => ({
            binding: obj,
            controller,
            originalValue: this.defaultValue,
            isColor: true,
            colorComponent: component
        }));

        // Set up change handlers
        controller.on('change', event => {
            Object.entries(event.value).forEach(([component, value]) => {
                this.onChange?.(this.name + '_' + component, value);
            });
        });

        return bindings;
    }

    /**
     * Gets the control type
     * @returns {string}
     */
    static get type() {
        return 'color';
    }

    /**
     * Checks if this control can handle the parameter
     * @param {import('../types/controls.js').ControlParameter} param 
     * @returns {boolean}
     */
    static canHandle(param) {
        Logger.log('ColorControl checking if can handle:', param.paramType);
        return param.paramType === 'color' || param.paramType === 'vec4';
    }
} 