import { BaseControl } from './base-control';
import { actions } from '../../../state/signals';
import type { ControlConfig, ControlBinding, ColorControlOptions} from '../types/controls';
import type { HydraParameter } from '../../../editor/ast/types';
interface ColorValues {
    r: number;
    g: number;
    b: number;
}

/**
 * Control for RGB color values
 */
export class ColorControl extends BaseControl {
    private originalValues: ColorValues;
    /**
     * Creates a new color control
     */
    constructor(config: ControlConfig & { HydraParameterGroup: HydraParameter[] }) {
        super(config);
        this.HydraParameterGroup = config.HydraParameterGroup;
        this.originalValues = {
            r: this.HydraParameterGroup.find(p => p.paramName === 'r')?.value ?? 0,
            g: this.HydraParameterGroup.find(p => p.paramName === 'g')?.value ?? 0,
            b: this.HydraParameterGroup.find(p => p.paramName === 'b')?.value ?? 0
        };
    }

    /**
     * Process control options
     * @protected
     */
    protected _processOptions(options: ColorControlOptions): ColorControlOptions {
        const baseOptions = super._processOptions(options) as ColorControlOptions;
        return {
            ...baseOptions,
            type: options.type ?? 'float'
        };
    }

    /**
     * Creates the control binding
     * @param folder - The folder to add the control to
     * @param tweakpaneAdapter - The Tweakpane adapter
     * @returns The control binding
     */
    createBinding(folder: any, tweakpaneAdapter: any): ControlBinding[] {
        if (!this.HydraParameterGroup) throw new Error(`HydraParameterGroup is required for ${this.name}`);
        const obj = { 
            color: {
                r: this.originalValues.r,
                g: this.originalValues.g,
                b: this.originalValues.b
            }
        };
        
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'color', {
            label: this.options.label,
            color: { type: (this.options as HydraParameter).type ?? 'float' }
        });

        // Store parameter objects by their component name
        const paramsByComponent: Record<string, HydraParameter> = {
            r: this.HydraParameterGroup.find(p => p.paramName === 'r') as HydraParameter,
            g: this.HydraParameterGroup.find(p => p.paramName === 'g') as HydraParameter,
            b: this.HydraParameterGroup.find(p => p.paramName === 'b') as HydraParameter
        };

        controller.on('change', (event: { value: ColorValues }) => {
            const { r, g, b } = event.value;
            // Update each component using its parameter's key
            if (paramsByComponent.r.key) actions.updateParameterValueByKey(paramsByComponent.r.key, r);
            if (paramsByComponent.g.key) actions.updateParameterValueByKey(paramsByComponent.g.key, g);
            if (paramsByComponent.b.key) actions.updateParameterValueByKey(paramsByComponent.b.key, b);
        });

        if (controller.element) {
            controller.element.setAttribute('data-hydra-param', this.name);
            const input = controller.element.querySelector('input');
            if (input) {
                input.setAttribute('data-hydra-input', this.name);
            }
        }

        return ['r', 'g', 'b'].map(component => ({
            binding: obj,
            controller,
            originalValue: this.originalValues[component as keyof ColorValues],
            isColor: true,
            colorComponent: component as 'r' | 'g' | 'b',
            parameter: paramsByComponent[component]
        }));
    }

    /**
     * Gets the control type
     */
    static get type(): string {
        return 'color';
    }

    /**
     * Checks if this control can handle the parameter
     * @param param - The parameter to check
     */
    static canHandle(HydraParameter: HydraParameter): boolean {
        return HydraParameter.paramType === 'color' || 
               !!(HydraParameter.paramName && ['r', 'g', 'b'].includes(HydraParameter.paramName.toLowerCase()));
    }
} 