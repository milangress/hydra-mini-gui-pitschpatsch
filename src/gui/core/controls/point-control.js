import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Control for point values (x,y coordinates)
 */
export class PointControl extends BaseControl {
    /**
     * Creates a new point control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
        
        // Set default options for point controls
        this.options = {
            x: { min: 0, max: 1, step: 0.01 },
            y: { min: 0, max: 1, step: 0.01 },
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
        const obj = { point: { x: this.value, y: this.value } };
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'point', {
            x: this.options.x,
            y: this.options.y,
            label: this.options.label
        });

        // Create bindings for both x and y components
        const xBinding = {
            binding: obj,
            controller,
            originalValue: this.defaultValue,
            isPoint: true,
            pointKey: 'point',
            pointComponent: 'x',
            mapPoint: true
        };

        const yBinding = {
            binding: obj,
            controller,
            originalValue: this.defaultValue,
            isPoint: true,
            pointKey: 'point',
            pointComponent: 'y',
            mapPoint: true
        };

        // Set up change handlers
        controller.on('change', event => {
            this.onChange?.(this.name + '_x', event.value.x);
            this.onChange?.(this.name + '_y', event.value.y);
        });

        return [xBinding, yBinding];
    }

    /**
     * Gets the control type
     * @returns {string}
     */
    static get type() {
        return 'point';
    }

    /**
     * Checks if this control can handle the parameter
     * @param {import('../types/controls.js').ControlParameter} param 
     * @returns {boolean}
     */
    static canHandle(param) {
        Logger.log('PointControl checking if can handle:', param.paramType);
        return param.paramType === 'point' || param.paramType === 'vec2';
    }
} 