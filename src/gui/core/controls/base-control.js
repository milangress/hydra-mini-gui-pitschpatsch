/**
 * Base class for all controls
 */
export class BaseControl {
    /**
     * Creates a new control
     * @param {import('../types/controls.js').ControlConfig} config 
     */
    constructor(config) {
        this.name = config.name;
        this.value = config.value;
        this.defaultValue = config.defaultValue;
        this.onChange = config.onChange;
        this.parameter = config.parameter;
        this.options = this._processOptions(config.options || {});
    }

    /**
     * Process control options
     * @protected
     * @param {import('../types/controls.js').BaseControlOptions} options 
     * @returns {import('../types/controls.js').BaseControlOptions}
     */
    _processOptions(options) {
        return {
            label: options.label || this.parameter?.paramName || this.name,
            readonly: options.readonly || false
        };
    }

    /**
     * Creates the control binding
     * @param {Object} folder - The folder to add the control to
     * @param {Object} tweakpaneAdapter - The Tweakpane adapter
     * @returns {import('../types/controls.js').ControlBinding}
     */
    createBinding(folder, tweakpaneAdapter) {
        const obj = { [this.name]: this.value };
        const controller = tweakpaneAdapter.createBinding(folder, obj, this.name, this.options);

        controller.on('change', event => {
            this.value = event.value;
            this.onChange?.(this.parameter?.index || this.name, this.value);
        });

        if (controller.element) {
            controller.element.setAttribute('data-hydra-param', this.name);
            const input = controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.name);
            }
        }

        return {
            binding: obj,
            controller,
            originalValue: this.defaultValue,
            parameter: this.parameter
        };
    }

    /**
     * Gets the control type
     * @returns {string}
     */
    static get type() {
        return 'base';
    }

    /**
     * Checks if this control can handle the parameter
     * @param {import('../types/controls.js').ControlParameter} param 
     * @returns {boolean}
     */
    static canHandle(param) {
        return false;
    }
} 