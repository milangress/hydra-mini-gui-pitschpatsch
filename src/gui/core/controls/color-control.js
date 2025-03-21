import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';
import { actions } from '../../../state/signals.js';

/**
 * Control for RGB color values
 */
export class ColorControl extends BaseControl {
    /**
     * Creates a new color control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
        this.params = config.params;
        this.originalValues = {
            r: this.params.find(p => p.paramName === 'r')?.value ?? 0,
            g: this.params.find(p => p.paramName === 'g')?.value ?? 0,
            b: this.params.find(p => p.paramName === 'b')?.value ?? 0
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

        // Store parameter objects by their component name
        const paramsByComponent = {
            r: this.params.find(p => p.paramName === 'r'),
            g: this.params.find(p => p.paramName === 'g'),
            b: this.params.find(p => p.paramName === 'b')
        };

        controller.on('change', event => {
            const { r, g, b } = event.value;
            // Update each component using its parameter's key
            if (paramsByComponent.r) actions.updateParameterValueByKey(paramsByComponent.r.key, r);
            if (paramsByComponent.g) actions.updateParameterValueByKey(paramsByComponent.g.key, g);
            if (paramsByComponent.b) actions.updateParameterValueByKey(paramsByComponent.b.key, b);
        });

        if (controller.element) {
            controller.element.setAttribute('data-hydra-param', this.name);
            const input = controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.name);
            }
        }

        return ['r', 'g', 'b'].map(component => ({
            binding: obj,
            controller,
            originalValue: this.originalValues[component],
            isColor: true,
            colorComponent: component,
            parameter: paramsByComponent[component]
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
        return param.paramType === 'color' || 
               (param.paramName && ['r', 'g', 'b'].includes(param.paramName.toLowerCase()));
    }
} 