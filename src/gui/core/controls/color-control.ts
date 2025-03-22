import { BaseControl } from './base-control';
import { actions } from '../../../state/signals';
import { ControlConfig, ControlBinding, ColorControlOptions} from '../types/controls';
import { HydraParameter } from '../../../editor/ast/types';
interface ColorValues {
    r: number;
    g: number;
    b: number;
}

/**
 * Control for RGB color values
 */
export class ColorControl extends BaseControl {
    private params: HydraParameter[];
    private originalValues: ColorValues;

    /**
     * Creates a new color control
     */
    constructor(config: ControlConfig & { params: HydraParameter[] }) {
        super(config);
        this.params = config.params;
        this.originalValues = {
            r: this.params.find(p => p.paramName === 'r')?.value ?? 0,
            g: this.params.find(p => p.paramName === 'g')?.value ?? 0,
            b: this.params.find(p => p.paramName === 'b')?.value ?? 0
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
        const paramsByComponent: Record<string, HydraParameter | undefined> = {
            r: this.params.find(p => p.paramName === 'r'),
            g: this.params.find(p => p.paramName === 'g'),
            b: this.params.find(p => p.paramName === 'b')
        };

        controller.on('change', (event: { value: ColorValues }) => {
            const { r, g, b } = event.value;
            // Update each component using its parameter's key
            if (paramsByComponent.r?.key) actions.updateParameterValueByKey(paramsByComponent.r.key, r);
            if (paramsByComponent.g?.key) actions.updateParameterValueByKey(paramsByComponent.g.key, g);
            if (paramsByComponent.b?.key) actions.updateParameterValueByKey(paramsByComponent.b.key, b);
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
    static canHandle(param: HydraParameter): boolean {
        return param.paramType === 'color' || 
               (param.paramName && ['r', 'g', 'b'].includes(param.paramName.toLowerCase()));
    }
} 