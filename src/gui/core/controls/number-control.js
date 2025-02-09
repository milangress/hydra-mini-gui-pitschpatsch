import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Control for numeric values and option selections
 */
export class NumberControl extends BaseControl {
    /**
     * Creates a new number control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
    }

    /**
     * Process control options
     * @protected
     * @param {import('../types/controls.js').NumberControlOptions} options 
     * @returns {import('../types/controls.js').NumberControlOptions}
     */
    _processOptions(options) {
        const baseOptions = super._processOptions(options);

        if (options.type === 'select' && options.values) {
            return {
                ...baseOptions,
                type: 'select',
                options: options.values.reduce((acc, opt) => {
                    acc[opt] = opt;
                    return acc;
                }, {})
            };
        }

        return {
            ...baseOptions,
            type: 'number'
        };
    }

    /**
     * Creates the control binding
     * @param {Object} folder - The folder to add the control to
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {import('../types/controls.js').ControlBinding}
     */
    createBinding(folder, tweakpaneAdapter) {
        Logger.log('NumberControl createBinding - parameter before:', this.parameter);
        const binding = super.createBinding(folder, tweakpaneAdapter);
        
        // Use the original value${index} naming scheme
        const controlName = `value${this.parameter.index}`;
        binding.name = controlName;
        
        // Override the onChange handler
        const originalOnChange = binding.controller.on;
        binding.controller.on = (event, callback) => {
            if (event === 'change') {
                return originalOnChange.call(binding.controller, event, (ev) => {
                    
                    // Pass the index directly like the original
                    this.onChange(this.parameter.index, ev.value);
                    console.log('NumberControl onChange - parameter:', this.parameter.index, ev.value);
                });
            }
            return originalOnChange.call(binding.controller, event, callback);
        };
        
        // Add test attributes
        if (binding.controller?.element) {
            binding.controller.element.setAttribute('data-hydra-param', controlName);
            const input = binding.controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', controlName);
            }
        }
        
        return binding;
    }

    /**
     * Gets the control type
     * @returns {string}
     */
    static get type() {
        return 'number';
    }

    /**
     * Checks if this control can handle the parameter
     * @param {import('../types/controls.js').ControlParameter} param 
     * @returns {boolean}
     */
    static canHandle(param) {
        Logger.log('NumberControl checking if can handle:', param.paramType);
        return param.paramType === 'float' || 
               param.paramType === 'number' || 
               param.paramType === 'select';
    }
} 