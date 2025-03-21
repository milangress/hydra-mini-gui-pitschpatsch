// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

import { getHydra, waitForGUI } from './utils/hydra-utils.js';
import { hookIntoEval, hookIntoHydraEditor } from './editor/editor-integration.js';
import { GUIManager } from './gui/core/gui-manager.js';
import { CodeValueManager } from './editor/code-value-manager.js';
import { Logger } from './utils/logger.js';
import { actions, currentCode, currentEvalCode, currentEvalRange, valuePositions } from './state/signals.js';

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
}

// Initialize after ensuring lil-gui is loaded
waitForGUI().then(() => {
    window._hydraGui = new HydraMiniGUI();
    Logger.log('HydraMiniGUI initialized!');
}).catch(error => {
    Logger.error('Error initializing HydraMiniGUI:', error);
}); 