import { Parser } from 'acorn';
import { ParameterUtils } from '../utils/parameter-utils.js';
import { ControlFactory } from './controls/control-factory.js';
import { Logger } from '../../utils/logger.js';
import { actions } from '../../state/signals.js';

/**
 * Manages parameter organization and control creation
 */
export class ParameterManager {
    constructor(tweakpaneAdapter) {
        this.controls = new Map();
        this.tweakpaneAdapter = tweakpaneAdapter;
    }

    /**
     * Updates the GUI with new parameter values
     */
    updateParameters(folder, currentCode, valuePositions) {
        this.controls.clear();

        if (valuePositions.length === 0) {
            // Check for syntax errors if we have code but no values
            if (currentCode) {
                try {
                    Parser.parse(currentCode, { ecmaVersion: 'latest' });
                    return new Map();
                } catch (error) {
                    throw error;
                }
            }
            return new Map();
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
            group.params.sort((a, b) => a.paramCount - b.paramCount);

            // Create controls for this group
            const groupControls = ControlFactory.createControls(
                groupFolder, 
                group.params,
                (index, value) => actions.updateParameter(`value${index}`, value),
                this.tweakpaneAdapter
            );
            
            Logger.log('Created controls:', groupControls);
            
            // Add all controls to our main map
            for (const [key, value] of groupControls) {
                this.controls.set(key, value);
            }
        }

        return this.controls;
    }

    /**
     * Updates a specific control's value
     */
    updateControlValue(controlName, newValue) {
        const control = this.controls.get(controlName);
        ParameterUtils.updateControlValue(control, newValue);
    }

    /**
     * Resets all controls to their original values
     */
    resetAllValues() {
        for (const control of this.controls.values()) {
            ParameterUtils.resetControlValue(control);
        }
    }

    /**
     * Resets a specific control to its original value
     */
    revertValue(index, originalValue) {
        const controlName = `value${index}`;
        const control = this.controls.get(controlName);
        if (control) {
            control.originalValue = originalValue;
            ParameterUtils.resetControlValue(control);
        }
    }

    /**
     * Cleans up all controls
     */
    cleanup() {
        this.controls.clear();
    }
} 