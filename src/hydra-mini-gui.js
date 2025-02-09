// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

import { getHydra, waitForGUI } from './utils/hydra-utils.js';
import { hookIntoEval, hookIntoHydraEditor } from './editor/editor-integration.js';
import { GUIManager } from './gui/gui-manager.js';
import { CodeValueManager } from './editor/code-value-manager.js';

export class HydraMiniGUI {
    constructor() {
        // Ensure singleton instance
        if (window._hydraGui) {
            console.log('HydraMiniGUI instance already exists');
            return window._hydraGui;
        }

        this.hydra = getHydra();
        this.currentCode = "";
        this.currentEvalCode = ""; // Store the current state for evaluation
        this.valuePositions = [];
        this.lastEvalRange = null; // Track the last evaluated code range
        this.isUpdating = false;
        this._updateTimeout = null;
        this.guiManager = new GUIManager(this.hydra);
        this.codeManager = new CodeValueManager(this.hydra);
        this.guiManager.setupGUI();
        
        hookIntoEval.call(this);
        hookIntoHydraEditor.call(this);

        // Store instance
        window._hydraGui = this;
    }

    updateGUI() {
        try {
            this.valuePositions = this.codeManager.findValues(this.currentCode);
            this.guiManager.updateGUI(this.currentCode, this.valuePositions, this.updateValue.bind(this));
            this.guiManager.hideError(); // Clear any previous plugin errors
        } catch (error) {
            console.error('Error updating GUI:', error);
            this.guiManager.showError('Plugin Error: ' + error.toString());
        }
    }

    updateValue(index, newValue) {
        try {
            // Update both editor and evaluation immediately
            this.codeManager.updateValue(
                index,
                newValue,
                this.valuePositions,
                this.lastEvalRange
            );

            // Update our current code to match the new state
            if (window.cm && this.lastEvalRange) {
                this.currentCode = window.cm.getRange(this.lastEvalRange.start, this.lastEvalRange.end);
            }
            this.guiManager.hideError(); // Clear any previous plugin errors
        } catch (error) {
            console.error('Error updating value:', error);
            this.guiManager.showError('Plugin Error: ' + error.toString());
            // Revert the GUI to show the original value
            if (this.valuePositions[index]) {
                const originalValue = this.valuePositions[index].value;
                this.guiManager.revertValue(index, originalValue);
            }
        }
    }

    evaluateCode() {
        if (!this.editor) return;
        const code = this.editor.getValue();
        console.log('evaluating code', code);
        this.hydra.eval(code);
    }

    onReplEval() {
        console.log('on repl eval');
        try {
            // Update our current code state when eval happens
            if (window.cm && this.lastEvalRange) {
                this.currentCode = window.cm.getRange(this.lastEvalRange.start, this.lastEvalRange.end);
            }
        } catch (error) {
            console.error('Error in REPL eval:', error);
            this.guiManager.showError('Plugin Error: ' + error.toString());
        }
    }

    onCodeChange() {
        console.log('on code change');
        clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(() => {
            try {
                if (window.cm) {
                    // Update current code from the last eval range if available
                    if (this.lastEvalRange) {
                        this.currentCode = window.cm.getRange(this.lastEvalRange.start, this.lastEvalRange.end);
                    } else {
                        this.currentCode = window.cm.getValue();
                    }
                    console.log('updating gui');
                    this.updateGUI();
                }
            } catch (error) {
                console.error('Error handling code change:', error);
                this.guiManager.showError('Plugin Error: ' + error.toString());
            }
        }, 500);
    }
}

// Initialize after ensuring lil-gui is loaded
waitForGUI().then(() => {
    window._hydraGui = new HydraMiniGUI();
    console.log('HydraMiniGUI initialized!');
}).catch(error => {
    console.error('Error initializing HydraMiniGUI:', error);
}); 