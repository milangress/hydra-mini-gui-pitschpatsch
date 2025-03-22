// hydra-mini-gui.js
// A plugin for Hydra that creates a GUI for controlling numeric values

import { getHydra, waitForGUI } from './utils/hydra-utils';
import { hookIntoEval, hookIntoHydraEditor } from './editor/editor-integration';
import { GUIManager } from './gui/core/gui-manager';
import { CodeValueManager } from './editor/code-value-manager';
import { Logger } from './utils/logger';
import { initializeCodeSignals } from './state/signals';

export class HydraMiniGUI {
    public hydra: any; // We'll type this properly once we have hydra-synth types
    public isUpdating: boolean;
    public _updateTimeout: number | null;
    public guiManager: GUIManager;
    public codeManager: CodeValueManager;

    constructor() {
        const existingInstance = window._hydraGui;
        if (existingInstance) {
            Logger.log('HydraMiniGUI instance already exists');
            return existingInstance;
        }

        this.hydra = getHydra();
        this.isUpdating = false;
        this._updateTimeout = null;
        this.guiManager = new GUIManager(this.hydra);
        this.codeManager = new CodeValueManager(this.hydra);
        
        // Initialize code signals with the formatter from codeManager
        initializeCodeSignals(this.codeManager._codeFormatter);
        
        // Setup the GUI
        this.guiManager.setupGUI();
        
        hookIntoEval.call(this);
        hookIntoHydraEditor.call(this);

        // Store instance
        if (!window._hydraGui) {
            window._hydraGui = this;
        }
    }
} 