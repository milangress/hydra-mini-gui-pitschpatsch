// Settings page functionality for the GUI
import { GUIUtils } from './gui-utils.js';
import { Logger } from '../utils/logger.js';

export class SettingsPage {
    constructor(hydra) {
        this.hydra = hydra;
        this.page = null;
        this.errorFolder = null;
        this.codeMonitorFolder = null;
        this.statsFolder = null;
        this.defaultsFolder = null;
        this.currentCode = '';
        this._statsInterval = null;
        this.onSetDefault = null;
    }

    _getFunctionId(val) {
        return `${val.functionName}_line${val.lineNumber}_pos${val.functionStartCh}`;
    }

    setup(page) {
        this.page = page;
        
        // Add control buttons to settings tab
        const controlsFolder = GUIUtils.createFolder(this.page, {
            title: 'Controls',
            expanded: true
        });

        // Add logging toggle
        GUIUtils.createBinding(controlsFolder, Logger, 'isEnabled', {
            label: 'Enable Logging',
            view: 'boolean'
        });

        // Add reset button
        GUIUtils.createButton(controlsFolder, {
            title: 'Reset All Values',
            onClick: () => this.onReset?.()
        });

        // Add hush button
        GUIUtils.createButton(controlsFolder, {
            title: 'Hush',
            onClick: () => this.hydra.synth.hush()
        });
        
        // Add statistics folder
        this.statsFolder = GUIUtils.createFolder(this.page, {
            title: 'Statistics',
            expanded: true
        });

        GUIUtils.createBinding(this.statsFolder, this.hydra.synth.stats, 'fps', {
            label: 'FPS',
            view: 'graph',
            min: 0,
            max: 180,
            readonly: true
        });

        GUIUtils.createReadOnlyBinding(this.statsFolder, this.hydra.synth, 'time', {
            label: 'Time'
        });
        
        // Add defaults folder
        this.defaultsFolder = GUIUtils.createFolder(this.page, {
            title: 'Defaults',
            expanded: false
        });

        // Add code monitor folder to settings tab
        this.codeMonitorFolder = GUIUtils.createFolder(this.page, {
            title: 'Current Code',
            expanded: false
        });
        
        GUIUtils.createCodeBinding(this.codeMonitorFolder, this.currentCode || 'No code yet');
        
        // Add error folder to settings tab (hidden by default)
        this.errorFolder = GUIUtils.createFolder(this.page, { 
            title: 'Errors',
            expanded: false
        });
        
        GUIUtils.createMessageBinding(this.errorFolder, 'No errors');
        this.errorFolder.hidden = true;
    }

    updateDefaults(valuePositions) {
        if (!this.defaultsFolder) return;

        // Clear existing defaults
        GUIUtils.clearFolder(this.defaultsFolder);

        // Group and sort parameters
        const functionGroups = GUIUtils.groupByFunction(valuePositions, 
            val => val.paramType === 'float' && val.paramDefault !== undefined
        );
        const sortedGroups = GUIUtils.sortAndCountInstances(functionGroups);
        
        for (const { displayName, group } of sortedGroups) {
            const funcFolder = GUIUtils.createFolder(this.defaultsFolder, {
                title: displayName,
                expanded: false
            });

            // Sort parameters by their index
            group.params.sort((a, b) => a.parameterIndex - b.parameterIndex);

            // Add a button or label for each parameter
            group.params.forEach(param => {
                // Parse both values as numbers for comparison
                const currentValue = parseFloat(param.value);
                const defaultValue = parseFloat(param.paramDefault);
                const isDefault = !isNaN(currentValue) && !isNaN(defaultValue) && 
                                Math.abs(currentValue - defaultValue) < 0.0001;

                if (isDefault) {
                    // If value matches default, show as disabled button
                    GUIUtils.createReadOnlyBinding(funcFolder, 
                        { [param.paramName]: param.value }, 
                        param.paramName, 
                        { label: param.paramName }
                    );
                } else {
                    // If value differs from default, show as clickable button
                    GUIUtils.createButton(funcFolder, {
                        title: `${Number(param.value)} → [ ${Number(param.paramDefault)} ]`,
                        label: param.paramName,
                        onClick: () => this.onSetDefault?.(param.index, param.paramDefault)
                    });
                }
            });
        }
    }

    updateCode(code) {
        this.currentCode = code || '';
        if (this.codeMonitorFolder) {
            GUIUtils.clearFolder(this.codeMonitorFolder);
            GUIUtils.createCodeBinding(this.codeMonitorFolder, this.currentCode || 'No code');
        }
    }

    showError(message) {
        if (!this.errorFolder) return;
        
        this.errorFolder.hidden = false;
        GUIUtils.clearFolder(this.errorFolder);
        GUIUtils.createErrorBinding(this.errorFolder, message);
    }

    hideError() {
        if (this.errorFolder) {
            this.errorFolder.hidden = true;
        }
    }

    cleanup() {
        this.page = null;
        this.errorFolder = null;
        this.codeMonitorFolder = null;
        this.statsFolder = null;
        this.defaultsFolder = null;
        this.currentCode = '';
    }

    setResetCallback(callback) {
        this.onReset = callback;
    }

    setDefaultCallback(callback) {
        this.onSetDefault = callback;
    }
} 