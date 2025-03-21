import { DOMAdapter } from '../adapters/dom-adapter.js';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter.js';
import { ParameterManager } from './parameter-manager.js';
import { SettingsPage } from './settings-page.js';
import { Logger } from '../../utils/logger.js';
import { layout, parameters, settings, errors, actions, currentCode, valuePositions } from '../../state/signals.js';

/**
 * New GUIManager that separates concerns and is more testable
 */
export class GUIManager {
    constructor(hydra) {
        // Adapters and managers
        this.domAdapter = new DOMAdapter();
        this.tweakpaneAdapter = new TweakpaneAdapter();
        this.parameterManager = new ParameterManager(this.tweakpaneAdapter);
        this.settingsPage = new SettingsPage(hydra, this.tweakpaneAdapter);
        
        // Tweakpane instance
        this.tabs = null;
        this.parametersTab = null;
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

        this._setupTabs();
        this._addPlaceholder();

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
                actions.updateParameter(`value${index}`, defaultValue);
            }
        });
    }

    /**
     * Adds placeholder text
     */
    _addPlaceholder(message = 'Waiting for code...') {
        if (!this.parametersTab) return;
        this.tweakpaneAdapter.createMessageBinding(this.parametersTab, message);
    }

    /**
     * Updates the GUI with new code and values
     */
    updateGUI() {
        Logger.log('updating gui', !this.tweakpaneAdapter.pane, 'current code:', currentCode.value);
        if (!this.tweakpaneAdapter.pane) {
            this.setupGUI();
        }

        if (this.parametersTab) {
            this.tweakpaneAdapter.clearFolder(this.parametersTab);
        }

        try {
            // Update parameters
            this.parameterManager.updateParameters(
                this.parametersTab, 
                currentCode.value, 
                valuePositions.value
            );

            // Update settings
            this.settingsPage.updateCode(currentCode.value);
            this.settingsPage.updateDefaults(valuePositions.value);
            actions.clearErrors();

            if (valuePositions.value.length === 0) {
                this._addPlaceholder('No controls available');
            }
        } catch (error) {
            actions.setError(error.message);
            this.settingsPage.showError(error.message);
            this._addPlaceholder('No controls available');
        }
    }

    /**
     * Updates a specific control value
     */
    updateControlValue(controlName, newValue) {
        this.parameterManager.updateControlValue(controlName, newValue);
        actions.updateParameter(controlName, newValue);
    }

    /**
     * Cleans up resources
     */
    cleanup() {
        this.tweakpaneAdapter.cleanup();
        this.settingsPage.cleanup();
        this.parameterManager.cleanup();
        this.domAdapter.cleanup();
        
        this.tabs = null;
        this.parametersTab = null;
    }
} 