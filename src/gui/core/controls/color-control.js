import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Control for color values (r,g,b)
 * Groups r, g, b parameters into a single color picker
 */
export class ColorControl extends BaseControl {
    /**
     * Creates a new color control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
        this.originalValues = {
            r: config.value,
            g: config.value,
            b: config.value
        };
    }

    /**
     * Process control options
     * @protected
     * @param {import('../types/controls.js').ColorControlOptions} options 
     * @returns {import('../types/controls.js').ColorControlOptions}
     */
    _processOptions(options) {
        const baseOptions = super._processOptions(options);
        return {
            ...baseOptions,
            type: options.type ?? 'float'
        };
    }

    /**
     * Creates the control binding
     * @param {Object} folder - The folder to add the control to
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {import('../types/controls.js').ControlBinding[]}
     */
    createBinding(folder, tweakpaneAdapter) {
        const obj = { 
            color: {
                r: this.originalValues.r,
                g: this.originalValues.g,
                b: this.originalValues.b
            }
        };
        
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'color', {
            label: this.options.label,
            color: { type: this.options.type }
        });

        controller.on('change', event => {
            const { r, g, b } = event.value;
            if (this.parameter) {
                const baseIndex = this.parameter.index - (this.parameter.paramName === 'r' ? 0 : this.parameter.paramName === 'g' ? 1 : 2);
                this.onChange?.(baseIndex, r);
                this.onChange?.(baseIndex + 1, g);
                this.onChange?.(baseIndex + 2, b);
            } else {
                this.onChange?.(this.name + '_r', r);
                this.onChange?.(this.name + '_g', g);
                this.onChange?.(this.name + '_b', b);
            }
        });

        if (controller.element) {
            controller.element.setAttribute('data-hydra-param', this.name);
            const input = controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.name);
            }
        }

        return ['r', 'g', 'b'].map((component, i) => ({
            binding: obj,
            controller,
            originalValue: this.originalValues[component],
            isColor: true,
            colorComponent: component,
            parameter: this.parameter && {
                ...this.parameter,
                index: this.parameter.index - (this.parameter.paramName === 'r' ? 0 : this.parameter.paramName === 'g' ? 1 : 2) + i
            }
        }));
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