import { createInitialState, reducer, actions } from './state.js';
import { DOMAdapter } from '../adapters/dom-adapter.js';
import { TweakpaneAdapter } from '../adapters/tweakpane-adapter.js';
import { ParameterManager } from './parameter-manager.js';
import { SettingsPage } from './settings-page.js';
import { Logger } from '../../utils/logger.js';

/**
 * New GUIManager that separates concerns and is more testable
 */
export class GUIManager {
    constructor(hydra) {
        // Core state management
        this.state = createInitialState();
        this.dispatch = this.dispatch.bind(this);
        
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
     * Updates state using pure reducer
     */
    dispatch(action) {
        const nextState = reducer(this.state, action);
        this.state = nextState;
        return nextState;
    }

    /**
     * Sets up the GUI
     */
    setupGUI() {
        Logger.log('setting up gui');
        
        this.cleanup();
        
        // Setup container using DOM adapter
        const container = this.domAdapter.setupContainer(this.state.layout);
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
            this.dispatch(actions.updateSettings({ isReset: true }));
        });
        this.settingsPage.setDefaultCallback((index, defaultValue) => {
            if (defaultValue !== undefined) {
                this.parameterManager.revertValue(index, defaultValue);
                this.dispatch(actions.updateParameter(index, defaultValue));
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
    updateGUI(currentCode, valuePositions, onValueChange) {
        Logger.log('updating gui', !this.tweakpaneAdapter.pane, 'current code:', currentCode);
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
                currentCode, 
                valuePositions,
                (index, value) => {
                    onValueChange(index, value);
                    this.dispatch(actions.updateParameter(index, value));
                }
            );

            // Update settings
            this.settingsPage.updateCode(currentCode);
            this.settingsPage.updateDefaults(valuePositions);
            this.dispatch(actions.clearError());

            if (valuePositions.length === 0) {
                this._addPlaceholder('No controls available');
            }
        } catch (error) {
            this.dispatch(actions.setError(error.message));
            this.settingsPage.showError(error.message);
            this._addPlaceholder('No controls available');
        }
    }

    /**
     * Updates a specific control value
     */
    updateControlValue(controlName, newValue) {
        this.parameterManager.updateControlValue(controlName, newValue);
        this.dispatch(actions.updateParameter(controlName, newValue));
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
        
        // Reset state
        this.state = createInitialState();
    }
} 