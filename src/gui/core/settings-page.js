import { Logger } from '../../utils/logger.js';
import { ParameterUtils } from '../utils/parameter-utils.js';

/**
 * Manages the settings page of the GUI
 */
export class SettingsPage {
    constructor(hydra, tweakpaneAdapter) {
        this.hydra = hydra;
        this.tweakpaneAdapter = tweakpaneAdapter;
        this.page = null;
        this.folders = {
            controls: null,
            stats: null,
            defaults: null,
            codeMonitor: null,
            errors: null
        };
        this.currentCode = '';
        this.callbacks = {
            onReset: null,
            onSetDefault: null
        };
    }

    /**
     * Sets up the settings page
     */
    setup(page) {
        this.page = page;
        this._setupControlsFolder();
        this._setupStatsFolder();
        this._setupDefaultsFolder();
        this._setupCodeMonitorFolder();
        this._setupErrorsFolder();
    }

    /**
     * Sets up the controls folder
     */
    _setupControlsFolder() {
        this.folders.controls = this.tweakpaneAdapter.createFolder(this.page, {
            title: 'Controls',
            expanded: true
        });

        // Add logging toggle
        this.tweakpaneAdapter.createBinding(this.folders.controls, Logger, 'isEnabled', {
            label: 'Enable Logging',
            view: 'boolean'
        });

        // Add reset button
        this.tweakpaneAdapter.createButton(this.folders.controls, {
            title: 'Reset All Values',
            onClick: () => this.callbacks.onReset?.()
        });

        // Add hush button
        this.tweakpaneAdapter.createButton(this.folders.controls, {
            title: 'Hush',
            onClick: () => this.hydra.synth.hush()
        });
    }

    /**
     * Sets up the statistics folder
     */
    _setupStatsFolder() {
        this.folders.stats = this.tweakpaneAdapter.createFolder(this.page, {
            title: 'Statistics',
            expanded: true
        });

        this.tweakpaneAdapter.createBinding(this.folders.stats, this.hydra.synth.stats, 'fps', {
            label: 'FPS',
            view: 'graph',
            min: 0,
            max: 180,
            readonly: true
        });

        this.tweakpaneAdapter.createReadOnlyBinding(this.folders.stats, this.hydra.synth, 'time', {
            label: 'Time'
        });
    }

    /**
     * Sets up the defaults folder
     */
    _setupDefaultsFolder() {
        this.folders.defaults = this.tweakpaneAdapter.createFolder(this.page, {
            title: 'Defaults',
            expanded: false
        });
    }

    /**
     * Sets up the code monitor folder
     */
    _setupCodeMonitorFolder() {
        this.folders.codeMonitor = this.tweakpaneAdapter.createFolder(this.page, {
            title: 'Current Code',
            expanded: false
        });

        this.tweakpaneAdapter.createCodeBinding(this.folders.codeMonitor, this.currentCode || 'No code yet');
    }

    /**
     * Sets up the errors folder
     */
    _setupErrorsFolder() {
        this.folders.errors = this.tweakpaneAdapter.createFolder(this.page, {
            title: 'Errors',
            expanded: false
        });

        this.tweakpaneAdapter.createMessageBinding(this.folders.errors, 'No errors');
        this.folders.errors.hidden = true;
    }

    /**
     * Updates the defaults display
     */
    updateDefaults(valuePositions) {
        if (!this.folders.defaults) return;

        this.tweakpaneAdapter.clearFolder(this.folders.defaults);

        // Group and sort parameters
        const functionGroups = ParameterUtils.groupByFunction(valuePositions, 
            val => val.paramType === 'float' && val.paramDefault !== undefined
        );
        const sortedGroups = ParameterUtils.sortAndCountInstances(functionGroups);
        
        for (const { displayName, group } of sortedGroups) {
            const funcFolder = this.tweakpaneAdapter.createFolder(this.folders.defaults, {
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
                    this.tweakpaneAdapter.createReadOnlyBinding(funcFolder, 
                        { [param.paramName]: param.value }, 
                        param.paramName, 
                        { label: param.paramName }
                    );
                } else {
                    // If value differs from default, show as clickable button
                    this.tweakpaneAdapter.createButton(funcFolder, {
                        title: `${Number(param.value)} → [ ${Number(param.paramDefault)} ]`,
                        label: param.paramName,
                        onClick: () => this.callbacks.onSetDefault?.(param.index, param.paramDefault)
                    });
                }
            });
        }
    }

    /**
     * Updates the code display
     */
    updateCode(code) {
        this.currentCode = code || '';
        if (this.folders.codeMonitor) {
            this.tweakpaneAdapter.clearFolder(this.folders.codeMonitor);
            this.tweakpaneAdapter.createCodeBinding(this.folders.codeMonitor, this.currentCode || 'No code');
        }
    }

    /**
     * Shows an error message
     */
    showError(message) {
        if (!this.folders.errors) return;
        
        this.folders.errors.hidden = false;
        this.tweakpaneAdapter.clearFolder(this.folders.errors);
        this.tweakpaneAdapter.createErrorBinding(this.folders.errors, message);
    }

    /**
     * Hides the error display
     */
    hideError() {
        if (this.folders.errors) {
            this.folders.errors.hidden = true;
        }
    }

    /**
     * Sets the reset callback
     */
    setResetCallback(callback) {
        this.callbacks.onReset = callback;
    }

    /**
     * Sets the default value callback
     */
    setDefaultCallback(callback) {
        this.callbacks.onSetDefault = callback;
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        this.page = null;
        this.folders = {
            controls: null,
            stats: null,
            defaults: null,
            codeMonitor: null,
            errors: null
        };
        this.currentCode = '';
        this.callbacks = {
            onReset: null,
            onSetDefault: null
        };
    }
} 