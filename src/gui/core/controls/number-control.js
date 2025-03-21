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
        return param.paramType === 'float' || 
               param.paramType === 'number' || 
               param.paramType === 'select';
    }
} 