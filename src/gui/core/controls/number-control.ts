import { BaseControl } from './base-control';
import { Logger } from '../../../utils/logger';
import type { ControlConfig, ControlBinding, NumberControlOptions } from '../types/controls';
import type { HydraParameter } from '../../../editor/ast/types';

/**
 * Control for numeric values and option selections
 */
export class NumberControl extends BaseControl {

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
        if (!this.HydraParameter) throw new Error(`HydraParameter is required for ${this.name}`);
        
        Logger.log('NumberControl createBinding - parameter before:', this.HydraParameter);
        const binding = super.createBinding(folder, tweakpaneAdapter);
        
        // Ensure we're working with a single binding, not an array
        if (Array.isArray(binding)) {
            throw new Error('NumberControl expects a single binding, not an array');
        }
        
        // Use the parameter key for data attributes
        if (binding.controller.element && this.HydraParameter.key) {
            binding.controller.element.setAttribute('data-hydra-param', this.HydraParameter.key);
            const input = binding.controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.HydraParameter.key);
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
    static canHandle(HydraParameter: HydraParameter): boolean {
        Logger.log('NumberControl checking if can handle:', HydraParameter.paramType);
        return HydraParameter.paramType === 'float' || 
        HydraParameter.paramType === 'number' || 
        HydraParameter.paramType === 'select';
    }
} 