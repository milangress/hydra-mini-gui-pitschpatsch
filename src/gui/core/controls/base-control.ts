import { actions } from '../../../state/signals';
import type { ControlConfig, ControlBinding, BaseControlOptions } from '../types/controls';
import type { HydraParameter } from '../../../editor/ast/types';

/**
 * Base class for all controls
 */
export class BaseControl {
    protected name: string;
    protected value: any;
    protected originalValue: any;
    protected HydraParameter?: HydraParameter;
    protected HydraParameterGroup?: HydraParameter[];
    protected options: BaseControlOptions;
    protected isControlGroup: boolean;
    /**
     * Creates a new control
     */
    constructor(config: ControlConfig) {
        this.name = config.name;
        this.value = config.value;
        this.originalValue = config.originalValue;
        if (config.HydraParameter) this.HydraParameter = config.HydraParameter;
        if (config.HydraParameterGroup) this.HydraParameterGroup = config.HydraParameterGroup;
        this.options = this._processOptions(config.options || {});
        this.isControlGroup = !!this.HydraParameterGroup;
    }

    /**
     * Creates the control binding
     * @param folder - The folder to add the control to
     * @param tweakpaneAdapter - The Tweakpane adapter
     * @returns The control binding
     */
    createBinding(folder: any, tweakpaneAdapter: any): ControlBinding | ControlBinding[] {
        if (!this.HydraParameter) throw new Error(`HydraParameter is required for ${this.name}`);

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
            originalValue: this.originalValue,
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