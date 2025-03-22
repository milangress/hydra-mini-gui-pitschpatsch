import { DOMAdapter } from '../adapters/dom-adapter';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter';
import { ParameterManager } from './parameter-manager';
import { SettingsPage } from './settings-page';
import { Logger } from '../../utils/logger';
import { effect } from '@preact/signals-core';
import { layout, actions, currentCode, currentParameters, placeholderMessage } from '../../state/signals';
import { HydraInstance } from '../../editor/ast/types';
import { HydraParameter } from '../../editor/ast/types';
import { TweakpaneFolder, TweakpaneConfig, TweakpaneTab } from '../adapters/types';
import { Layout } from '../adapters/dom-types';

/**
 * Manages the GUI components
 */
export class GUIManager {
    private hydra: HydraInstance;
    private domAdapter: DOMAdapter;
    private tweakpaneAdapter: TweakpaneAdapter;
    private parameterManager: ParameterManager;
    private settingsPage: SettingsPage | null;
    private tabs: TweakpaneTab | null;
    private parametersTab: TweakpaneFolder | null;
    private settingsTab: TweakpaneFolder | null;
    private container: HTMLElement | null;
    private isSettingUp: boolean;

    constructor(hydra: HydraInstance) {
        this.hydra = hydra;
        this.domAdapter = new DOMAdapter();
        this.tweakpaneAdapter = new TweakpaneAdapter();
        this.parameterManager = new ParameterManager(this.tweakpaneAdapter);
        this.settingsPage = null;
        this.tabs = null;
        this.parametersTab = null;
        this.settingsTab = null;
        this.container = null;
        this.isSettingUp = false;

        this._setupSignalEffects();
    }

    /**
     * Sets up signal effects for automatic GUI updates
     */
    private _setupSignalEffects(): void {
        // Add effect to automatically update GUI when store changes
        effect(() => {
            const HydraParameter = currentParameters.value;
            const code = currentCode.value;
            if (HydraParameter.length > 0 && code) {
                Logger.log('gui-manager effect', HydraParameter, code);
                this._updateGUI(HydraParameter, code);
            }
        });

        // Add effect for placeholder message
        effect(() => {
            const message = placeholderMessage.value;
            Logger.log('gui-manager effect placeholder message', message);
            if (message && this.parametersTab) {
                Logger.log('gui-manager effect placeholder message', message);
                this.tweakpaneAdapter.clearFolder(this.parametersTab);
                this.tweakpaneAdapter.createMessageBinding(this.parametersTab, message);
            }
        });
    }

    /**
     * Sets up the GUI
     */
    setupGUI(): void {
        Logger.log('setting up gui');
        
        // Prevent multiple simultaneous setups
        if (this.isSettingUp) return;
        this.isSettingUp = true;
        
        try {
            this.cleanup();
            
            // Convert layout to match dom-types Layout interface
            const domLayout: Layout = {
                zIndex: parseInt(layout.value.zIndex),
                position: layout.value.position
            };
            
            // Setup container using DOM adapter
            this.container = this.domAdapter.setupContainer(domLayout);
            if (!this.container) {
                this.isSettingUp = false;
                return;
            }

            // Create Tweakpane instance with specific configuration
            const paneConfig: TweakpaneConfig = {
                title: 'Hydra Controls',
                container: this.container
            };
            this.tweakpaneAdapter.createPane(paneConfig);

            // Initialize settings page after Tweakpane is created
            this.settingsPage = new SettingsPage(this.hydra as any, this.tweakpaneAdapter);

            this._setupTabs();
        } finally {
            this.isSettingUp = false;
        }
    }

    /**
     * Sets up tabs
     * @private
     */
    private _setupTabs(): void {
        // Create tabs with a slight delay to ensure proper initialization
        setTimeout(() => {
            const tabs = this.tweakpaneAdapter.createTabs(['Parameters', 'Settings']);
            if (!tabs) return;

            this.tabs = tabs;
            
            // Get the tab pages and convert them to folders
            this.parametersTab = tabs.pages[0] as unknown as TweakpaneFolder;
            this.settingsTab = tabs.pages[1] as unknown as TweakpaneFolder;

        }, 100);
    }



    /**
     * Updates the GUI with new code and values
     * @private
     */
    private _updateGUI(HydraParameter: HydraParameter[], code: string): void {
        Logger.log('updating gui', 'current code:', code, 'HydraParameter:', HydraParameter);
        
        // If no container exists or we're not currently setting up, initialize the GUI
        if (!this.container && !this.isSettingUp) {
            this.setupGUI();
            // Return early to let the setup complete and trigger another update
            return;
        }

        if (this.parametersTab) {
            this.tweakpaneAdapter.clearFolder(this.parametersTab);
        }

        try {
            // Update parameters
            Logger.log('parameterManager.updateParameters', this.parametersTab, code, HydraParameter);
            if (code && HydraParameter && HydraParameter.length > 0 && this.parametersTab) {
                this.parameterManager.updateParameters(
                    this.parametersTab, 
                    code, 
                    HydraParameter
                );
                this.settingsPage?.updateDefaults(HydraParameter);
            }

            // Update settings
            actions.clearErrors();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error('gui-manager updateGUI error', error);
            actions.setError(errorMessage);
            this.settingsPage?.showError(errorMessage);
        }
    }

    /**
     * Cleans up resources
     */
    cleanup(): void {
        this.tweakpaneAdapter.cleanup();
        if (this.settingsPage) {
            this.settingsPage.cleanup();
            this.settingsPage = null;
        }
        this.parameterManager.cleanup();
        this.domAdapter.cleanup();
        
        this.tabs = null;
        this.parametersTab = null;
        this.settingsTab = null;
        this.container = null;
    }
} 