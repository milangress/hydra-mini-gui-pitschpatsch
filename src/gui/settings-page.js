// Settings page functionality for the GUI
export class SettingsPage {
    constructor(hydra) {
        this.hydra = hydra;
        this.page = null;
        this.errorFolder = null;
        this.codeMonitorFolder = null;
        this.statsFolder = null;
        this.currentCode = '';
        this._statsInterval = null;
    }

    setup(page) {
        this.page = page;
        
        // Add control buttons to settings tab
        const controlsFolder = this.page.addFolder({
            title: 'Controls',
            expanded: true
        });

        // Add reset button
        const resetObj = { reset: () => this.onReset?.() };
        controlsFolder.addButton({
            title: 'Reset All Values',
        }).on('click', () => resetObj.reset());

        // Add hush button
        const hushObj = { hush: () => this.hydra.synth.hush() };
        controlsFolder.addButton({
            title: 'Hush',
        }).on('click', () => hushObj.hush());
        
        // Add statistics folder
        this.statsFolder = this.page.addFolder({
            title: 'Statistics',
            expanded: true
        });

        this.statsFolder.addBinding(this.hydra.synth.stats, 'fps', {
            label: 'FPS',
            view: 'graph',
            min: 0,
            max: 180,
            readonly: true
        });

        this.statsFolder.addBinding(this.hydra.synth, 'time', {
            readonly: true,
            label: 'Time'
        });
        
        // Add code monitor folder to settings tab
        this.codeMonitorFolder = this.page.addFolder({
            title: 'Current Code',
            expanded: false
        });
        
        const codeObj = { code: this.currentCode || 'No code yet' };
        this.codeMonitorFolder.addBinding(codeObj, 'code', {
            readonly: true,
            multiline: true,
            rows: 5
        });
        
        // Add error folder to settings tab (hidden by default)
        this.errorFolder = this.page.addFolder({ 
            title: 'Errors',
            expanded: false
        });
        
        const errorObj = { message: 'No errors' };
        this.errorFolder.addBinding(errorObj, 'message', {
            readonly: true
        });
        this.errorFolder.hidden = true;
    }

    updateCode(code) {
        this.currentCode = code || '';
        if (this.codeMonitorFolder) {
            this.codeMonitorFolder.children.slice().forEach(child => child.dispose());
            const codeObj = { code: this.currentCode || 'No code' };
            this.codeMonitorFolder.addBinding(codeObj, 'code', {
                readonly: true,
                multiline: true,
                rows: 5
            });
        }
    }

    showError(message) {
        if (!this.errorFolder) return;
        
        this.errorFolder.hidden = false;
        
        // Update error message
        const errorBinding = { message };
        this.errorFolder.children.slice().forEach(child => child.dispose());
        const errorController = this.errorFolder.addBinding(errorBinding, 'message', {
            readonly: true
        });
        
        // Style the error message
        errorController.element.classList.add('error-message');
    }

    hideError() {
        if (this.errorFolder) {
            this.errorFolder.hidden = true;
        }
    }

    cleanup() {
        this.page = null;
        this.errorFolder = null;
        this.codeMonitorFolder = null;
        this.statsFolder = null;
        this.currentCode = '';
    }

    setResetCallback(callback) {
        this.onReset = callback;
    }
} 