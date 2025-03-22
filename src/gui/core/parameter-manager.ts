import { Parser } from 'acorn';
import { ParameterUtils } from '../utils/parameter-utils';
import { Logger } from '../../utils/logger';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter';
import { TweakpaneFolder } from '../adapters/types';
import { ValuePosition, ValueMatch } from '../../editor/ast/types';
import { actions } from '../../state/signals';
import { ParameterGroupDetector } from '../utils/parameter-group-detector';
import { NumberControl } from './controls/number-control';
import { ColorControl } from './controls/color-control';
import { PointControl } from './controls/point-control';
import { ControlParameter } from './types/controls';

/**
 * Manages parameter organization and GUI updates
 */
export class ParameterManager {
    private tweakpaneAdapter: TweakpaneAdapter;

    constructor(tweakpaneAdapter: TweakpaneAdapter) {
        this.tweakpaneAdapter = tweakpaneAdapter;
    }

    /**
     * Updates the GUI with new parameter values
     */
    updateParameters(folder: TweakpaneFolder, currentCode: string | null, valuePositions: ValuePosition[]): void {
        if (valuePositions && valuePositions.length === 0) {
            // Check for syntax errors if we have code but no values
            if (currentCode) {
                try {
                    Parser.parse(currentCode, { ecmaVersion: 'latest' });
                    return;
                } catch (error) {
                    throw error;
                }
            }
            return;
        }

        Logger.log('Value positions:', valuePositions);

        // Group values by their function and line number
        const functionGroups = ParameterUtils.groupByFunction(valuePositions);
        
        // Sort groups and count instances
        const sortedGroups = ParameterUtils.sortAndCountInstances(functionGroups);
        
        for (const { displayName, group } of sortedGroups) {
            Logger.log('Creating controls for group:', displayName, 'params:', group.params);
            
            const groupFolder = this.tweakpaneAdapter.createFolder(folder, {
                title: displayName,
                expanded: true
            });

            // Add data attribute for testing
            groupFolder.element.setAttribute('data-hydra-function', group.params[0].functionName);

            // Sort parameters by their order in the function call
            group.params.sort((a, b) => (a.parameterIndex || 0) - (b.parameterIndex || 0));

            // Let the ControlFactory handle control creation and binding
            this.createControls(
                groupFolder, 
                group.params,
                this.tweakpaneAdapter
            );
        }
    }

    /**
     * Updates a specific parameter value
     */
    updateControlValue(controlName: string, newValue: unknown): void {
        actions.updateParameterValueByKey(controlName, newValue as number | string);
    }

    /**
     * Resets all parameter values
     */
    resetAllValues(): void {
        actions.updateSettings({ isReset: true });
    }

    /**
     * Resets a specific parameter to its original value
     */
    revertValue(key: string, originalValue: unknown): void {
        actions.updateParameterValueByKey(key, originalValue as number | string);
    }

    /**
     * Cleans up resources
     */
    cleanup(): void {
        // Nothing to clean up anymore since we're not maintaining state
    }

    createControls(
        folder: TweakpaneFolder, 
        params: ControlParameter[],
        tweakpaneAdapter: TweakpaneAdapter
    ): void {
        const groups = ParameterGroupDetector.detectGroups(params);

        groups.forEach(group => {
            Logger.log('ControlFactory creating control for group:', group);
            
            if (group.type === 'color') {
                new ColorControl({
                    name: group.params.map(p => p.paramName).join(''),
                    options: {
                        label: group.metadata.label ?? group.params[0].paramName,
                        type: 'float'
                    },
                    params: group.params,
                    value: undefined,
                    defaultValue: undefined
                }).createBinding(folder, tweakpaneAdapter);
            } else if (group.type === 'point') {
                new PointControl({
                    name: group.params.map(p => p.paramName).join(''),
                    options: {
                        label: group.metadata.label ?? group.params[0].paramName,
                        mode: 'normal'
                    },
                    params: group.params,
                    value: undefined,
                    defaultValue: undefined
                }).createBinding(folder, tweakpaneAdapter);
            } else {
                // Single number control
                const param = group.params[0];
                new NumberControl({
                    name: param.paramName,
                    options: { label: param.paramName },
                    value: param.value,
                    defaultValue: param.paramDefault,
                    parameter: param
                }).createBinding(folder, tweakpaneAdapter);
            }
        });
    }
} 