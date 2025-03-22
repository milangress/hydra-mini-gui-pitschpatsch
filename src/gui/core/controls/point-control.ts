import { BaseControl } from './base-control';
import { actions } from '../../../state/signals';
import type { ControlConfig, ControlBinding, PointControlOptions } from '../types/controls';
import type { HydraParameter } from '../../../editor/ast/types';

interface PointMapping {
    mode: 'centered' | 'extended' | 'normal';
    config: {
        x: { min: number; max: number; step: number; };
        y: { min: number; max: number; step: number; };
    };
    toDisplay: (val: number) => number;
    fromDisplay: (val: number) => number;
}

interface PointValue {
    x: number;
    y: number;
}

/**
 * Control for point values (x,y coordinates)
 * Supports different mapping modes based on parameter defaults
 */
export class PointControl extends BaseControl {
    private mapping: PointMapping;
    private originalValues: PointValue;

    constructor(config: ControlConfig & { HydraParameterGroup: HydraParameter[] }) {
        super(config);
        this.HydraParameterGroup = config.HydraParameterGroup;
        this.originalValues = {
            x: this.HydraParameterGroup.find(p => p.paramName.toLowerCase().endsWith('x'))?.value ?? 0,
            y: this.HydraParameterGroup.find(p => p.paramName.toLowerCase().endsWith('y'))?.value ?? 0
        };
        this.mapping = this._determineMapping((this.originalValues.x + this.originalValues.y) / 2);
    }    /**
     * Process control options
     * @protected
     */
    protected _processOptions(options: PointControlOptions): PointControlOptions {
        const baseOptions = super._processOptions(options) as PointControlOptions;

        return {
            ...baseOptions,
            mode: this.mapping.mode,
            x: this.mapping.config.x,
            y: this.mapping.config.y
        };
    }

    /**
     * Determines the mapping mode based on parameter defaults
     * @private
     */
    private _determineMapping(defaultValue: number): PointMapping {
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
     * @param folder - The folder to add the control to
     * @param tweakpaneAdapter - The Tweakpane adapter
     * @returns The control binding
     */
    createBinding(folder: any, tweakpaneAdapter: any): ControlBinding[] {
        if (!this.HydraParameterGroup) throw new Error(`HydraParameterGroup is required for ${this.name}`);

        const displayValue = this.mapping.toDisplay(this.HydraParameterGroup[0].value);
        const obj = { point: { x: displayValue, y: displayValue } };
        
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'point', {
            x: (this.options as PointControlOptions).x,
            y: (this.options as PointControlOptions).y,
            label: this.options.label
        });

        // Store parameter objects by their component
        const paramsByComponent: Record<string, HydraParameter> = {
            x: this.HydraParameterGroup.find(p => p.paramName.toLowerCase().endsWith('x')) as HydraParameter,
            y: this.HydraParameterGroup.find(p => p.paramName.toLowerCase().endsWith('y')) as HydraParameter
        };

        controller.on('change', (event: { value: PointValue }) => {
            const { x, y } = event.value;
            const hydraX = this.mapping.fromDisplay(x);
            const hydraY = this.mapping.fromDisplay(y);
            // Update each component using its parameter's key
            actions.updateParameterValueByKey(paramsByComponent.x.key, hydraX);
            actions.updateParameterValueByKey(paramsByComponent.y.key, hydraY);
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
                originalValue: paramsByComponent.x.value,
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'x',
                mapPoint: this.mapping.mode === 'centered',
                parameter: paramsByComponent.x
            },
            {
                binding: obj,
                controller,
                originalValue: paramsByComponent.y.value,
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'y',
                mapPoint: this.mapping.mode === 'centered',
                parameter: paramsByComponent.y
            }
        ];
    }

    /**
     * Gets the control type
     */
    static get type(): string {
        return 'point';
    }

    /**
     * Checks if this control can handle the parameter
     * @param param - The parameter to check
     */
    static canHandle(HydraParameter: HydraParameter): boolean {
        return HydraParameter.paramType === 'point' || 
               !!(HydraParameter.paramName && (HydraParameter.paramName.endsWith('X') || HydraParameter.paramName.endsWith('Y') ||
               HydraParameter.paramName.endsWith('x') || HydraParameter.paramName.endsWith('y')));
    }
} 