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
        this.valuePositions = this.codeManager.findValues(this.currentCode);
        this.guiManager.updateGUI(this.currentCode, this.valuePositions, this.updateValue.bind(this));
    }

    updateValue(index, newValue) {
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
    }

    evaluateCode() {
        if (!this.editor) return;
        const code = this.editor.getValue();
        console.log('evaluating code', code);
        try {
            this.hydra.eval(code);
        } catch (error) {
            console.error('Error evaluating code:', error);
        }
    }

    onReplEval() {
        console.log('on repl eval');
        // Update our current code state when eval happens
        if (window.cm && this.lastEvalRange) {
            this.currentCode = window.cm.getRange(this.lastEvalRange.start, this.lastEvalRange.end);
        }
    }

    onCodeChange() {
        console.log('on code change');
        clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(() => {
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