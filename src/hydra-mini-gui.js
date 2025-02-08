// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

import { getHydra, waitForGUI } from './utils/hydra-utils.js';
import { hookIntoEval, hookIntoHydraEditor } from './editor/editor-integration.js';
import { GUIManager } from './gui/gui-manager.js';
import { findNumbers } from './utils/number-finder.js';
import { ValueUpdater } from './editor/value-updater.js';

export class HydraMiniGUI {
    constructor() {
        this.hydra = getHydra(); // Get hydra instance here
        this.currentCode = "";
        this.currentEvalCode = ""; // Store the current state for evaluation
        this.valuePositions = [];
        this.lastEvalRange = null; // Track the last evaluated code range
        this.isUpdating = false; // Add flag to prevent recursive updates
        this._updateTimeout = null; // Add debounce timer
        this.guiManager = new GUIManager(this.hydra);
        this.valueUpdater = new ValueUpdater(this.hydra);
        this.guiManager.setupGUI();
        hookIntoEval.call(this);
        hookIntoHydraEditor.call(this);
    }

    updateGUI() {
        this.valuePositions = findNumbers(this.currentCode);
        this.guiManager.updateGUI(this.currentCode, this.valuePositions, this.updateValue.bind(this));
    }

    updateValue(index, newValue) {
        const newEvalCode = this.valueUpdater.updateValue(
            index,
            newValue,
            this.valuePositions,
            this.lastEvalRange,
            this.currentCode
        );
        if (newEvalCode) {
            this.currentEvalCode = newEvalCode;
        }
    }

    evaluateCode() {
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
    }

    onCodeChange() {
        console.log('on code change');
        clearTimeout(this._updateTimeout);
        this._updateTimeout = setTimeout(() => {
            if (this.editor) {
                this.currentCode = this.editor.getValue();
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