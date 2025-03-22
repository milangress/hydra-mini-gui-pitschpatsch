import { Parser } from 'acorn';
import { ParameterUtils } from '../utils/parameter-utils';
import { Logger } from '../../utils/logger';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter';
import type { TweakpaneFolder } from '../adapters/types';
import type { HydraParameter } from '../../editor/ast/types';
import { ParameterGroupDetector } from '../utils/parameter-group-detector';
import { NumberControl } from './controls/number-control';
import { ColorControl } from './controls/color-control';
import { PointControl } from './controls/point-control';

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
    updateParameters(folder: TweakpaneFolder, currentCode: string | null, HydraParameter: HydraParameter[]): void {
        if (HydraParameter && HydraParameter.length === 0) {
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

        Logger.log('HydraParameter:', HydraParameter);

        // Group values by their function and line number
        const functionGroups = ParameterUtils.groupByFunction(HydraParameter);
        
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
     * Cleans up resources
     */
    cleanup(): void {
        // Nothing to clean up anymore since we're not maintaining state
    }

    createControls(
        folder: TweakpaneFolder, 
        HydraParameter: HydraParameter[],
        tweakpaneAdapter: TweakpaneAdapter
    ): void {
        const groups = ParameterGroupDetector.detectGroups(HydraParameter);

        groups.forEach(group => {
            Logger.log('ControlFactory creating control for group:', group);
            
            if (group.type === 'color') {
                new ColorControl({
                    name: group.params.map(p => p.paramName).join(''),
                    options: {
                        label: group.metadata.label ?? group.params[0].paramName,
                        type: 'float'
                    },
                    HydraParameterGroup: group.params as HydraParameter[],
                    value: undefined,
                    originalValue: undefined
                }).createBinding(folder, tweakpaneAdapter);
            } else if (group.type === 'point') {
                new PointControl({
                    name: group.params.map(p => p.paramName).join(''),
                    options: {
                        label: group.metadata.label ?? group.params[0].paramName,
                        mode: 'normal'
                    },
                    HydraParameterGroup: group.params as HydraParameter[],
                    value: undefined,
                    originalValue: undefined
                }).createBinding(folder, tweakpaneAdapter);
            } else {
                // Single number control
                const param = group.params[0];
                new NumberControl({
                    name: param.paramName,
                    options: { label: param.paramName },
                    value: param.value,
                    originalValue: param.paramDefault,
                    HydraParameter: param as HydraParameter
                }).createBinding(folder, tweakpaneAdapter);
            }
        });
    }
} 