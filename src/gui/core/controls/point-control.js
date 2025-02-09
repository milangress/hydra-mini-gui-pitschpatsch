import { BaseControl } from './base-control.js';
import { Logger } from '../../../utils/logger.js';

/**
 * Control for point values (x,y coordinates)
 * Supports different mapping modes based on parameter defaults
 */
export class PointControl extends BaseControl {
    /**
     * Creates a new point control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        super(config);
        this.mapping = this._determineMapping(config.defaultValue);
    }

    /**
     * Process control options
     * @protected
     * @param {import('../types/controls.js').PointControlOptions} options 
     * @returns {import('../types/controls.js').PointControlOptions}
     */
    _processOptions(options) {
        const baseOptions = super._processOptions(options);
        const mapping = this._determineMapping(this.defaultValue);

        return {
            ...baseOptions,
            mode: mapping.mode,
            x: mapping.config.x,
            y: mapping.config.y
        };
    }

    /**
     * Determines the mapping mode based on parameter defaults
     * @private
     */
    _determineMapping(defaultValue) {
        if (defaultValue === 0.5) {
            return {
                mode: 'centered',
                config: {
                    x: { min: -0.5, max: 0.5, step: 0.01 },
                    y: { min: -0.5, max: 0.5, step: 0.01 }
                },
                toDisplay: (val) => val * 2 - 0.5,
                fromDisplay: (val) => (val + 0.5) / 2
            };
        } else if (defaultValue === 1) {
            return {
                mode: 'extended',
                config: {
                    x: { min: 0, max: 30, step: 0.1 },
                    y: { min: 0, max: 30, step: 0.1 }
                },
                toDisplay: (val) => val,
                fromDisplay: (val) => val
            };
        } else {
            return {
                mode: 'normal',
                config: {
                    x: { min: 0, max: 1, step: 0.01 },
                    y: { min: 0, max: 1, step: 0.01 }
                },
                toDisplay: (val) => val,
                fromDisplay: (val) => val
            };
        }
    }

    /**
     * Creates the control binding
     * @param {Object} folder - The folder to add the control to
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {import('../types/controls.js').ControlBinding[]}
     */
    createBinding(folder, tweakpaneAdapter) {
        const displayValue = this.mapping.toDisplay(this.value);
        const obj = { point: { x: displayValue, y: displayValue } };
        
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'point', {
            x: this.options.x,
            y: this.options.y,
            label: this.options.label
        });

        controller.on('change', event => {
            const { x, y } = event.value;
            const hydraX = this.mapping.fromDisplay(x);
            const hydraY = this.mapping.fromDisplay(y);
            if (this.parameter) {
                const baseIndex = this.parameter.index - (this.parameter.paramName.endsWith('X') || this.parameter.paramName.endsWith('x') ? 0 : 1);
                this.onChange?.(baseIndex, hydraX);
                this.onChange?.(baseIndex + 1, hydraY);
            } else {
                this.onChange?.(this.name + '_x', hydraX);
                this.onChange?.(this.name + '_y', hydraY);
            }
        });

        if (controller.element) {
            controller.element.setAttribute('data-hydra-param', this.name);
            const input = controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.name);
            }
        }

        return [
            {
                binding: obj,
                controller,
                originalValue: this.defaultValue,
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'x',
                mapPoint: this.mapping.mode === 'centered',
                parameter: this.parameter && {
                    ...this.parameter,
                    index: this.parameter.index - (this.parameter.paramName.endsWith('X') || this.parameter.paramName.endsWith('x') ? 0 : 1)
                }
            },
            {
                binding: obj,
                controller,
                originalValue: this.defaultValue,
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'y',
                mapPoint: this.mapping.mode === 'centered',
                parameter: this.parameter && {
                    ...this.parameter,
                    index: this.parameter.index - (this.parameter.paramName.endsWith('X') || this.parameter.paramName.endsWith('x') ? 0 : 1) + 1
                }
            }
        ];
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