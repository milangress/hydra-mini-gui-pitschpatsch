import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Control for numeric values
 */
export class NumberControl extends BaseControl {
    /**
     * Creates a new number control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
        
        // Set default options for number controls
        this.options = {
            min: 0,
            max: 1,
            step: 0.01,
            ...this.options
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
        Logger.log('NumberControl checking if can handle:', param.paramType);
        return param.paramType === 'float' || param.paramType === 'number';
    }
} 