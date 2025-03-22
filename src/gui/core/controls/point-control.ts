import { BaseControl } from './base-control';
import { Logger } from '../../../utils/logger';
import { actions } from '../../../state/signals';
import { ControlConfig, ControlBinding, PointControlOptions } from '../types/controls';
import { HydraParameter } from '../../../editor/ast/types';

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
    private params: HydraParameter[];
    private mapping: PointMapping;


    /**
     * Process control options
     * @protected
     */
    protected _processOptions(options: PointControlOptions): PointControlOptions {
        const baseOptions = super._processOptions(options) as PointControlOptions;
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
        const displayValue = this.mapping.toDisplay(this.params[0].value);
        const obj = { point: { x: displayValue, y: displayValue } };
        
        const controller = tweakpaneAdapter.createBinding(folder, obj, 'point', {
            x: (this.options as PointControlOptions).x,
            y: (this.options as PointControlOptions).y,
            label: this.options.label
        });

        // Store parameter objects by their component
        const paramsByComponent: Record<string, HydraParameter | undefined> = {
            x: this.params.find(p => p.paramName.toLowerCase().endsWith('x')),
            y: this.params.find(p => p.paramName.toLowerCase().endsWith('y'))
        };

        controller.on('change', (event: { value: PointValue }) => {
            const { x, y } = event.value;
            const hydraX = this.mapping.fromDisplay(x);
            const hydraY = this.mapping.fromDisplay(y);
            // Update each component using its parameter's key
            if (paramsByComponent.x?.key) actions.updateParameterValueByKey(paramsByComponent.x.key, hydraX);
            if (paramsByComponent.y?.key) actions.updateParameterValueByKey(paramsByComponent.y.key, hydraY);
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
                originalValue: this.params[0].value,
                isPoint: true,
                pointKey: 'point',
                pointComponent: 'x',
                mapPoint: this.mapping.mode === 'centered',
                parameter: paramsByComponent.x
            },
            {
                binding: obj,
                controller,
                originalValue: this.params[0].value,
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
               (HydraParameter.paramName && (HydraParameter.paramName.endsWith('X') || HydraParameter.paramName.endsWith('Y') ||
               HydraParameter.paramName.endsWith('x') || HydraParameter.paramName.endsWith('y')));
    }
} 