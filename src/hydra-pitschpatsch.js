// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

import { getHydra, waitForGUI } from './utils/hydra-utils.js';
import { hookIntoEval, hookIntoHydraEditor } from './editor/editor-integration.js';
import { GUIManager } from './gui/core/gui-manager.js';
import { CodeValueManager } from './editor/code-value-manager.js';
import { Logger } from './utils/logger.js';
import { actions, currentCode, currentEvalCode, lastEvalRange, valuePositions } from './state/signals.js';

export class HydraMiniGUI {
    constructor() {
        // Ensure singleton instance
        if (window._hydraGui) {
            Logger.log('HydraMiniGUI instance already exists');
            return window._hydraGui;
        }

        this.hydra = getHydra();
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
        // Find values in current code
        const positions = this.codeManager.findValues(currentCode.value);
        actions.updateValuePositions(positions);
        
        // Update GUI with new values
        this.guiManager.updateGUI();
    }

    evaluateCode() {
        if (!this.editor) return;
        const code = this.editor.getValue();
        Logger.log('evaluating code', code);
        this.hydra.eval(code);
    }

    onReplEval() {
        Logger.log('on repl eval');
        try {
            // Update our current code state when eval happens
            if (window.cm && this.lastEvalRange) {
                this.currentCode = window.cm.getRange(this.lastEvalRange.start, this.lastEvalRange.end);
            }
        } catch (error) {
            Logger.error('Error in REPL eval:', error);
            this.guiManager.showError('Plugin Error: ' + error.toString());
        }
    }

    onCodeChange() {
        Logger.log('on code change');
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
                    Logger.log('updating gui');
                    this.updateGUI();
                }
            } catch (error) {
                Logger.error('Error handling code change:', error);
                this.guiManager.showError('Plugin Error: ' + error.toString());
            }
        }, 500);
    }
}

// Initialize after ensuring lil-gui is loaded
waitForGUI().then(() => {
    window._hydraGui = new HydraMiniGUI();
    Logger.log('HydraMiniGUI initialized!');
}).catch(error => {
    Logger.error('Error initializing HydraMiniGUI:', error);
}); 