import { DOMAdapter } from '../adapters/dom-adapter.js';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter.js';
import { ParameterManager } from './parameter-manager.js';
import { SettingsPage } from './settings-page.js';
import { Logger } from '../../utils/logger.js';
import { effect } from '@preact/signals-core';
import { layout, actions, currentCode, currentParameters, placeholderMessage } from '../../state/signals.js';

/**
 * New GUIManager that separates concerns and is more testable
 */
export class GUIManager {
    constructor(hydra) {
        this.hydra = hydra;
        this.domAdapter = new DOMAdapter();
        this.tweakpaneAdapter = new TweakpaneAdapter();
        this.parameterManager = new ParameterManager(this.tweakpaneAdapter);
        this.settingsPage = null;
        
        // Tweakpane instance
        this.tabs = null;
        this.parametersTab = null;

        // Add effect to automatically update GUI when store changes
        effect(() => {
            const positions = currentParameters.value;
            const code = currentCode.value;
            if (positions.length > 0 && code) {
                Logger.log('gui-manager effect', positions, code);
                this._updateGUI(positions, code);
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
    setupGUI() {
        Logger.log('setting up gui');
        
        this.cleanup();
        
        // Setup container using DOM adapter
        const container = this.domAdapter.setupContainer(layout.value);
        if (!container) return;

        // Create Tweakpane instance
        this.tweakpaneAdapter.createPane({
            title: 'Hydra Controls',
            container
        });

        // Initialize settings page after Tweakpane is created
        this.settingsPage = new SettingsPage(this.hydra, this.tweakpaneAdapter);

        this._setupTabs();

        return this.tweakpaneAdapter.pane;
    }

    /**
     * Sets up tabs
     */
    _setupTabs() {
        this.tabs = this.tweakpaneAdapter.createTabs(['Parameters', 'Settings']);
        if (!this.tabs) return;

        [this.parametersTab, this.settingsTab] = this.tabs.pages;
        this._setupCallbacks();
    }

    /**
     * Sets up callbacks
     */
    _setupCallbacks() {
        this.settingsPage.setup(this.settingsTab);
        this.settingsPage.setResetCallback(() => {
            this.parameterManager.resetAllValues();
            actions.updateSettings({ isReset: true });
        });
        this.settingsPage.setDefaultCallback((index, defaultValue) => {
            if (defaultValue !== undefined) {
                this.parameterManager.revertValue(index, defaultValue);
                actions.updateParameterValueByIndex(index, defaultValue);
            }
        });
    }

    /**
     * Updates the GUI with new code and values
     * @private
     */
    _updateGUI(positions, code) {
        Logger.log('updating gui', !this.tweakpaneAdapter.pane, 'current code:', code, 'positions:', positions);
        if (!this.tweakpaneAdapter.pane) {
            this.setupGUI();
        }

        if (this.parametersTab) {
            this.tweakpaneAdapter.clearFolder(this.parametersTab);
        }

        try {
            // Update parameters
            Logger.log('parameterManager.updateParameters', this.parametersTab, code, positions);
            if (code && positions && positions.length > 0) {
            this.parameterManager.updateParameters(
                this.parametersTab, 
                code, 
                positions
            );
            this.settingsPage.updateDefaults(positions);
        }

            // Update settings
            
            actions.clearErrors();
        } catch (error) {
            Logger.error('gui-manager updateGUI error', error);
            actions.setError(error.message);
            this.settingsPage.showError(error.message);
        }
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        this.tweakpaneAdapter.cleanup();
        if (this.settingsPage) {
            this.settingsPage.cleanup();
        }
        this.parameterManager.cleanup();
        this.domAdapter.cleanup();
        
        this.tabs = null;
        this.parametersTab = null;
        this.settingsPage = null;
    }
} 