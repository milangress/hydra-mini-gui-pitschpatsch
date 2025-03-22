import { BaseControl } from './base-control';
import { Logger } from '../../../utils/logger';
import { actions } from '../../../state/signals';
import { ControlConfig, ControlBinding, ControlParameter, NumberControlOptions } from '../types/controls';

/**
 * Control for numeric values and option selections
 */
export class NumberControl extends BaseControl {
    /**
     * Creates a new number control
     */
    constructor(config: ControlConfig) {
        super(config);
    }

    /**
     * Process control options
     * @protected
     */
    protected _processOptions(options: NumberControlOptions): NumberControlOptions {
        const baseOptions = super._processOptions(options) as NumberControlOptions;

        if (options.type === 'select' && options.values) {
            return {
                ...baseOptions,
                type: 'select',
                options: options.values.reduce<Record<string, any>>((acc, opt) => {
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
     * @param folder - The folder to add the control to
     * @param tweakpaneAdapter - The Tweakpane adapter
     * @returns The control binding
     */
    createBinding(folder: any, tweakpaneAdapter: any): ControlBinding {
        Logger.log('NumberControl createBinding - parameter before:', this.parameter);
        const binding = super.createBinding(folder, tweakpaneAdapter);
        
        // Ensure we're working with a single binding, not an array
        if (Array.isArray(binding)) {
            throw new Error('NumberControl expects a single binding, not an array');
        }
        
        // Use the parameter key for data attributes
        if (binding.controller?.element && this.parameter?.key) {
            binding.controller.element.setAttribute('data-hydra-param', this.parameter.key);
            const input = binding.controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.parameter.key);
            }
        }
        
        return binding;
    }

    /**
     * Gets the control type
     */
    static get type(): string {
        return 'number';
    }

    /**
     * Checks if this control can handle the parameter
     * @param param - The parameter to check
     */
    static canHandle(param: ControlParameter): boolean {
        Logger.log('NumberControl checking if can handle:', param.paramType);
        return param.paramType === 'float' || 
               param.paramType === 'number' || 
               param.paramType === 'select';
    }
} 