import { Logger } from '../../../utils/logger';
import { actions } from '../../../state/signals';
import { ControlConfig, ControlBinding, BaseControlOptions } from '../types/controls';
import { HydraParameter } from '../../../editor/ast/types';

/**
 * Base class for all controls
 */
export class BaseControl {
    protected name: string;
    protected value: any;
    protected defaultValue: any;
    protected HydraParameter: HydraParameter;
    protected options: BaseControlOptions;

    /**
     * Creates a new control
     */
    constructor(config: ControlConfig) {
        this.name = config.name;
        this.value = config.value;
        this.defaultValue = config.defaultValue;
        this.HydraParameter = config.HydraParameter;
        this.options = this._processOptions(config.options || {});
    }

    /**
     * Creates the control binding
     * @param folder - The folder to add the control to
     * @param tweakpaneAdapter - The Tweakpane adapter
     * @returns The control binding
     */
    createBinding(folder: any, tweakpaneAdapter: any): ControlBinding | ControlBinding[] {
        const obj = { [this.name]: this.value };
        const controller = tweakpaneAdapter.createBinding(folder, obj, this.name, this.options);

        controller.on('change', (event: { value: any }) => {
            this.value = event.value;
            if (this.HydraParameter?.key) {
                actions.updateParameterValueByKey(
                    this.HydraParameter.key,
                    this.value
                );
            }
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
            parameter: this.HydraParameter
        };
    }

    /**
     * Process control options
     * @protected
     */
    protected _processOptions(options: BaseControlOptions): BaseControlOptions {
        return {
            label: options.label || this.name,
            ...options
        };
    }

    /**
     * Gets the control type
     */
    static get type(): string {
        return 'base';
    }

    /**
     * Checks if this control can handle the parameter
     * @param param - The parameter to check
     */
    static canHandle(param: HydraParameter): boolean {
        return false;
    }
} 