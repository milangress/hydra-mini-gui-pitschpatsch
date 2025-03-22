import { Logger } from '../../utils/logger';
import { ParameterUtils } from '../utils/parameter-utils';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter';
import type { TweakpaneTab, Pane } from '../adapters/types';
import type { HydraParameter } from '../../editor/ast/types';
import type { HydraInstance, SettingsFolders, SettingsCallbacks } from './types/settings-page';

/**
 * Manages the settings page of the GUI
 */
export class SettingsPage {
    private hydra: HydraInstance;
    private tweakpaneAdapter: TweakpaneAdapter;
    private page: (Pane & TweakpaneTab) | null;
    private folders: SettingsFolders;
    private currentCode: string;
    private callbacks: SettingsCallbacks;

    constructor(hydra: HydraInstance, tweakpaneAdapter: TweakpaneAdapter) {
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
    setup(page: TweakpaneTab): void {
        this.page = page as (Pane & TweakpaneTab);
        this._setupControlsFolder();
        this._setupStatsFolder();
        this._setupDefaultsFolder();
        this._setupCodeMonitorFolder();
        this._setupErrorsFolder();
    }

    /**
     * Sets up the controls folder
     */
    private _setupControlsFolder(): void {
        this.folders.controls = this.tweakpaneAdapter.createFolder(this.page!, {
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
    private _setupStatsFolder(): void {
        this.folders.stats = this.tweakpaneAdapter.createFolder(this.page!, {
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
    private _setupDefaultsFolder(): void {
        this.folders.defaults = this.tweakpaneAdapter.createFolder(this.page!, {
            title: 'Defaults',
            expanded: false
        });
    }

    /**
     * Sets up the code monitor folder
     */
    private _setupCodeMonitorFolder(): void {
        this.folders.codeMonitor = this.tweakpaneAdapter.createFolder(this.page!, {
            title: 'Current Code',
            expanded: false
        });

        this.tweakpaneAdapter.createCodeBinding(this.folders.codeMonitor, this.currentCode || 'No code yet');
    }

    /**
     * Sets up the errors folder
     */
    private _setupErrorsFolder(): void {
        this.folders.errors = this.tweakpaneAdapter.createFolder(this.page!, {
            title: 'Errors',
            expanded: false
        });

        this.tweakpaneAdapter.createMessageBinding(this.folders.errors, 'No errors');
        (this.folders.errors as any).hidden = true;
    }

    /**
     * Updates the defaults display
     */
    updateDefaults(HydraParameter: HydraParameter[]): void {
        if (!this.folders.defaults) return;

        this.tweakpaneAdapter.clearFolder(this.folders.defaults);

        // Group and sort parameters
        const functionGroups = ParameterUtils.groupByFunction(HydraParameter, 
            (HydraParameter: HydraParameter & { paramType?: string; paramDefault?: any }) => 
                HydraParameter.paramType === 'float' && HydraParameter.paramDefault !== undefined
        );
        const sortedGroups = ParameterUtils.sortAndCountInstances(functionGroups);
        
        for (const { displayName, group } of sortedGroups) {
            const funcFolder = this.tweakpaneAdapter.createFolder(this.folders.defaults, {
                title: displayName,
                expanded: false
            });

            // Sort parameters by their index
            group.params.sort((a, b) => (a.parameterIndex || 0) - (b.parameterIndex || 0));

            // Add a button or label for each parameter
            group.params.forEach((HydraParameter: HydraParameter & { paramType?: string; paramDefault?: any; value?: any; index?: number }) => {
                // Parse both values as numbers for comparison
                const currentValue = parseFloat(HydraParameter.value);
                const defaultValue = parseFloat(HydraParameter.paramDefault);
                const isDefault = !isNaN(currentValue) && !isNaN(defaultValue) && 
                                Math.abs(currentValue - defaultValue) < 0.0001;

                if (isDefault) {
                    // If value matches default, show as disabled button
                    this.tweakpaneAdapter.createReadOnlyBinding(funcFolder, 
                        { [HydraParameter.paramName]: HydraParameter.value }, 
                        HydraParameter.paramName, 
                        { label: HydraParameter.paramName }
                    );
                } else {
                    // If value differs from default, show as clickable button
                    this.tweakpaneAdapter.createButton(funcFolder, {
                        title: `${Number(HydraParameter.value)} → [ ${Number(HydraParameter.paramDefault)} ]`,
                        label: HydraParameter.paramName,
                        onClick: () => this.callbacks.onSetDefault?.(HydraParameter.index, HydraParameter.paramDefault)
                    });
                }
            });
        }
    }

    /**
     * Updates the code display
     */
    updateCode(code: string | null): void {
        this.currentCode = code || '';
        if (this.folders.codeMonitor) {
            this.tweakpaneAdapter.clearFolder(this.folders.codeMonitor);
            this.tweakpaneAdapter.createCodeBinding(this.folders.codeMonitor, this.currentCode || 'No code');
        }
    }

    /**
     * Shows an error message
     */
    showError(message: string): void {
        if (!this.folders.errors) return;
        
        (this.folders.errors as any).hidden = false;
        this.tweakpaneAdapter.clearFolder(this.folders.errors);
        this.tweakpaneAdapter.createErrorBinding(this.folders.errors, message);
    }

    /**
     * Hides the error display
     */
    hideError(): void {
        if (this.folders.errors) {
            (this.folders.errors as any).hidden = true;
        }
    }

   

    

    /**
     * Cleans up resources
     */
    cleanup(): void {
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