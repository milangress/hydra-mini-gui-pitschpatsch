// GUI management functionality
import { Parser } from 'acorn';
import { Pane } from 'tweakpane';
import { SettingsPage } from './settings-page.js';
import { GUIUtils } from './gui-utils.js';
import { Logger } from '../utils/logger.js';

// Add error message styling
const style = document.createElement('style');
style.textContent = `
.error-message {
    color: #ff0000 !important;
}
.error-message .tp-lblv_l,
.error-message .tp-lblv_v {
    color: #ff0000 !important;
}
    #hydra-mini-gui::-webkit-scrollbar {
    width: 0px;
}
    .tp-tbpv_c {
    max-height: 80vh;
    overflow-y: auto;
    }
    .tp-tbpv_c::-webkit-scrollbar {
    width: 0px;
}   
`;
document.head.appendChild(style);

export class GUIManager {
    constructor(hydra) {
        this.hydra = hydra;
        this.gui = null;
        this.controls = new Map();
        this._observer = null;
        this.tabs = null;
        this.parametersTab = null;
        this.settingsPage = new SettingsPage(hydra);
    }

    _getFunctionId(val) {
        return `${val.functionName}_line${val.lineNumber}_pos${val.functionStartCh}`;
    }

    setupGUI() {
        Logger.log('setting up gui');
        
        // Clean up any existing GUI first
        this.cleanup();

        // Check for existing GUI in the DOM
        const existingGui = document.getElementById('hydra-mini-gui');
        if (existingGui) {
            Logger.log('Found existing GUI, removing it');
            existingGui.remove();
        }

        // Create the GUI
        this.gui = new Pane({
            title: 'Hydra Controls',
            container: document.createElement('div')
        });
        
        // Style the GUI container to work with Hydra
        const container = this.gui.element;
        container.style.zIndex = '9999';
        container.style.position = 'fixed';
        container.style.top = '50px';
        container.style.right = '10px';
        container.classList.add('hydra-ui'); // Add Hydra's UI class
        container.setAttribute('id', 'hydra-mini-gui'); // Add specific ID

        // Create tabs
        this.tabs = this.gui.addTab({
            pages: [
                {title: 'Parameters'},
                {title: 'Settings'}
            ]
        });

        // Store references to tabs
        [this.parametersTab, this.settingsTab] = this.tabs.pages;
        
        // Setup settings page
        this.settingsPage.setup(this.settingsTab);
        this.settingsPage.setResetCallback(() => this.resetAllValues());
        this.settingsPage.setDefaultCallback((index, defaultValue) => {
            if (defaultValue !== undefined) {
                const controlName = `value${index}`;
                const control = this.controls.get(controlName);
                if (control) {
                    if (control.isColor) {
                        control.binding.color[control.colorComponent] = defaultValue;
                    } else if (control.isPoint) {
                        const mappedValue = control.mapPoint ? defaultValue * 2 - 0.5 : defaultValue;
                        control.binding[control.pointKey][control.pointComponent] = mappedValue;
                    } else {
                        control.binding[controlName] = defaultValue;
                    }
                    control.controller.refresh();
                }
            }
        });

        // Find Hydra's editor container and add our GUI to it
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.appendChild(container);
        } else {
            // Fallback: create our own container that looks like Hydra's
            let ourContainer = document.getElementById('hydra-mini-gui-container');
            if (!ourContainer) {
                ourContainer = document.createElement('div');
                ourContainer.setAttribute('id', 'hydra-mini-gui-container');
                ourContainer.classList.add('hydra-ui');
                ourContainer.style.position = 'fixed';
                ourContainer.style.zIndex = '9998';
                ourContainer.style.top = '0';
                ourContainer.style.right = '0';
                document.body.appendChild(ourContainer);
            }
            ourContainer.appendChild(container);
        }

        // Add a placeholder until we have real controls
        const placeholderObj = { message: 'Waiting for code...' };
        this.parametersTab.addBinding(placeholderObj, 'message', {
            readonly: true
        });

        // Create a mutation observer to watch for DOM changes
        this._observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // If our GUI was removed, re-add it
                if ([...mutation.removedNodes].includes(container)) {
                    Logger.log('GUI was removed, re-adding');
                    const parent = container.parentElement || editorContainer || document.body;
                    // Only re-add if no other GUI exists
                    if (!document.getElementById('hydra-mini-gui')) {
                        parent.appendChild(container);
                        container.style.display = '';
                    }
                }
            });
        });

        // Start observing the document with the configured parameters
        this._observer.observe(document.body, { childList: true, subtree: true });
    }

    cleanup() {
        // Disconnect observer if it exists
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }

        // Dispose existing GUI if it exists
        if (this.gui) {
            this.gui.dispose();
            this.gui = null;
        }

        // Clean up settings page
        this.settingsPage.cleanup();

        // Clear controls map
        this.controls.clear();
        
        // Reset references
        this.tabs = null;
        this.parametersTab = null;
    }

    updateGUI(currentCode, valuePositions, onValueChange) {
        Logger.log('updating gui', !this.gui, 'current code:', currentCode);
        if (!this.gui) {
            this.setupGUI();
        }

        // Store valuePositions for reference
        this._lastValuePositions = valuePositions;

        // Update current code monitor
        this.settingsPage.updateCode(currentCode);

        // Update defaults section in settings page
        this.settingsPage.updateDefaults(valuePositions);

        // Store the GUI's position
        const container = this.gui.element;
        const guiPosition = {
            left: container.style.left,
            top: container.style.top,
            right: container.style.right
        };

        // Remove all existing controls from parameters tab
        this.parametersTab.children.slice().forEach(child => child.dispose());

        this.controls.clear();

        if (valuePositions.length === 0) {
            // Check if it's a syntax error
            try {
                if (currentCode) {
                    Parser.parse(currentCode, { ecmaVersion: 'latest' });
                    // If we get here, there's no syntax error
                    this.settingsPage.hideError();
                }
            } catch (error) {
                // Show syntax error in the error folder
                this.settingsPage.showError(error.message);
            }
            // Add a placeholder if no values found
            const placeholderObj = { message: 'No controls available' };
            this.parametersTab.addBinding(placeholderObj, 'message', {
                readonly: true
            });
        } else {
            // Hide error folder if we have valid values
            this.settingsPage.hideError();
            
            // Group values by their function and line number
            const functionGroups = GUIUtils.groupByFunction(valuePositions);
            const values = Object.fromEntries(
                valuePositions.map((val, i) => [`value${i}`, val.value])
            );

            // Use shared sorting and instance counting
            const sortedGroups = GUIUtils.sortAndCountInstances(functionGroups);
            
            for (const { displayName, group } of sortedGroups) {
                const folder = GUIUtils.createFolder(this.parametersTab, {
                    title: displayName,
                    expanded: true
                });

                group.params.sort((a, b) => a.paramCount - b.paramCount);

                // Check if we have r,g,b parameters in this group
                const paramNames = group.params.map(p => p.paramName);
                const hasRGB = paramNames.includes('r') && paramNames.includes('g') && paramNames.includes('b');

                // Find X/Y pairs by looking for parameters that end with X and Y
                const xyPairs = new Map();
                group.params.forEach(param => {
                    // Check for standard X/Y pairs (endsWith X/Y)
                    if (param.paramName.endsWith('X') || param.paramName.endsWith('x')) {
                        const baseParam = param.paramName.slice(0, -1);
                        const yParam = group.params.find(p => 
                            p.paramName === baseParam + 'Y' || 
                            p.paramName === baseParam + 'y'
                        );
                        if (yParam) {
                            xyPairs.set(baseParam.toLowerCase(), { x: param, y: yParam });
                        }
                    }
                    // Check for Mult pairs
                    else if (param.paramName === 'xMult') {
                        const yParam = group.params.find(p => p.paramName === 'yMult');
                        if (yParam) {
                            xyPairs.set('mult', { x: param, y: yParam });
                        }
                    }
                    // Check for Speed pairs
                    else if (param.paramName === 'speedX') {
                        const yParam = group.params.find(p => p.paramName === 'speedY');
                        if (yParam) {
                            xyPairs.set('speed', { x: param, y: yParam });
                        }
                    }
                });

                if (hasRGB) {
                    // Handle RGB color picker (existing code)
                    const colorObj = {
                        color: {
                            r: group.params.find(p => p.paramName === 'r').value,
                            g: group.params.find(p => p.paramName === 'g').value,
                            b: group.params.find(p => p.paramName === 'b').value
                        }
                    };

                    const controller = folder.addBinding(colorObj, 'color', {
                        rgb: { type: 'float' }
                    });

                    controller.on('change', (ev) => {
                        const { r, g, b } = ev.value;
                        group.params.forEach(param => {
                            if (param.paramName === 'r') onValueChange(param.index, r);
                            if (param.paramName === 'g') onValueChange(param.index, g);
                            if (param.paramName === 'b') onValueChange(param.index, b);
                        });
                    });

                    group.params.forEach(param => {
                        this.controls.set(param.controlName, {
                            controller,
                            originalValue: param.value,
                            binding: colorObj,
                            isColor: true,
                            colorComponent: param.paramName
                        });
                    });
                } else {
                    // Handle remaining parameters
                    const handledParams = new Set();

                    // First handle X/Y pairs
                    for (const [baseName, pair] of xyPairs) {
                        const defaultX = pair.x.paramDefault;
                        const defaultY = pair.y.paramDefault;
                        let config = {};

                        // Determine mapping based on defaults
                        if (defaultX === 0.5 || defaultY === 0.5) {
                            // Map 0-1 values to -0.5 to +0.5 range for display
                            const pointObj = {
                                [baseName]: {
                                    x: pair.x.value * 2 - 0.5,
                                    y: pair.y.value * 2 - 0.5
                                }
                            };
                            config = {
                                x: { min: -0.5, max: 0.5, step: 0.01 },
                                y: { min: -0.5, max: 0.5, step: 0.01 }
                            };
                            const controller = folder.addBinding(pointObj, baseName, config);

                            controller.on('change', (ev) => {
                                const { x, y } = ev.value;
                                // Map -0.5 to +0.5 back to 0-1 range for Hydra
                                onValueChange(pair.x.index, (x + 0.5) / 2);
                                onValueChange(pair.y.index, (y + 0.5) / 2);
                            });

                            this.controls.set(pair.x.controlName, {
                                controller,
                                originalValue: pair.x.value,
                                binding: pointObj,
                                isPoint: true,
                                pointComponent: 'x',
                                pointKey: baseName,
                                mapPoint: true
                            });

                            this.controls.set(pair.y.controlName, {
                                controller,
                                originalValue: pair.y.value,
                                binding: pointObj,
                                isPoint: true,
                                pointComponent: 'y',
                                pointKey: baseName,
                                mapPoint: true
                            });
                        } else if (defaultX === 1 || defaultY === 1) {
                            // No mapping, use 0-30 range
                            const pointObj = {
                                [baseName]: {
                                    x: pair.x.value,
                                    y: pair.y.value
                                }
                            };
                            config = {
                                x: { min: 0, max: 30, step: 0.1 },
                                y: { min: 0, max: 30, step: 0.1 }
                            };
                            const controller = folder.addBinding(pointObj, baseName, config);

                            controller.on('change', (ev) => {
                                const { x, y } = ev.value;
                                onValueChange(pair.x.index, x);
                                onValueChange(pair.y.index, y);
                            });

                            this.controls.set(pair.x.controlName, {
                                controller,
                                originalValue: pair.x.value,
                                binding: pointObj,
                                isPoint: true,
                                pointComponent: 'x',
                                pointKey: baseName,
                                mapPoint: false
                            });

                            this.controls.set(pair.y.controlName, {
                                controller,
                                originalValue: pair.y.value,
                                binding: pointObj,
                                isPoint: true,
                                pointComponent: 'y',
                                pointKey: baseName,
                                mapPoint: false
                            });
                        } else {
                            // Default is 0 or undefined, use 0-1 range
                            const pointObj = {
                                [baseName]: {
                                    x: pair.x.value,
                                    y: pair.y.value
                                }
                            };
                            config = {
                                x: { min: 0, max: 1, step: 0.01 },
                                y: { min: 0, max: 1, step: 0.01 }
                            };
                            const controller = folder.addBinding(pointObj, baseName, config);

                            controller.on('change', (ev) => {
                                const { x, y } = ev.value;
                                onValueChange(pair.x.index, x);
                                onValueChange(pair.y.index, y);
                            });

                            this.controls.set(pair.x.controlName, {
                                controller,
                                originalValue: pair.x.value,
                                binding: pointObj,
                                isPoint: true,
                                pointComponent: 'x',
                                pointKey: baseName,
                                mapPoint: false
                            });

                            this.controls.set(pair.y.controlName, {
                                controller,
                                originalValue: pair.y.value,
                                binding: pointObj,
                                isPoint: true,
                                pointComponent: 'y',
                                pointKey: baseName,
                                mapPoint: false
                            });
                        }

                        handledParams.add(pair.x.controlName);
                        handledParams.add(pair.y.controlName);
                    }

                    // Handle remaining non-paired parameters
                    group.params.forEach(param => {
                        if (!handledParams.has(param.controlName)) {
                            let controller;
                            const binding = { [param.controlName]: param.value };
                            
                            if (param.type === 'number') {
                                const config = {
                                    label: param.paramName
                                };
                                
                                controller = folder.addBinding(binding, param.controlName, config);
                            } else {
                                controller = folder.addBinding(binding, param.controlName, {
                                    label: param.paramName,
                                    options: param.options.reduce((acc, opt) => {
                                        acc[opt] = opt;
                                        return acc;
                                    }, {})
                                });
                            }

                            controller.on('change', (ev) => {
                                onValueChange(param.index, ev.value);
                            });

                            this.controls.set(param.controlName, { 
                                controller,
                                originalValue: param.value,
                                binding
                            });
                        }
                    });
                }
            }
        }

        // Restore position if it was moved
        if (guiPosition.left) container.style.left = guiPosition.left;
        if (guiPosition.top) container.style.top = guiPosition.top;
        if (guiPosition.right) container.style.right = guiPosition.right;

        // Ensure the GUI is in a good position if not already positioned
        if (!guiPosition.left && !guiPosition.right) {
            container.style.right = '10px';
            container.style.top = '10px';
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

    revertValue(index, originalValue) {
        const controlName = `value${index}`;
        const control = this.controls.get(controlName);
        if (control?.controller && control?.binding) {
            if (control.isColor) {
                // Handle color control revert
                const component = control.colorComponent;
                control.binding.color[component] = originalValue;
            } else if (control.isPoint) {
                // Handle point control revert
                const component = control.pointComponent;
                // Map 0-1 to -0.5/+0.5 for point controls
                const mappedValue = control.mapPoint ? originalValue * 2 - 0.5 : originalValue;
                control.binding[control.pointKey][component] = mappedValue;
            } else {
                // Handle normal control revert
                control.binding[controlName] = originalValue;
            }
            control.controller.refresh();
        }
    }

    resetAllValues() {
        for (const [controlName, control] of this.controls) {
            if (control?.controller && control?.binding && control?.originalValue !== undefined) {
                if (control.isColor) {
                    // Handle color control reset
                    const component = control.colorComponent;
                    control.binding.color[component] = control.originalValue;
                } else if (control.isPoint) {
                    // Handle point control reset
                    const component = control.pointComponent;
                    // Map 0-1 to -0.5/+0.5 for point controls
                    const mappedValue = control.mapPoint ? control.originalValue * 2 - 0.5 : control.originalValue;
                    control.binding[control.pointKey][component] = mappedValue;
                } else {
                    // Handle normal control reset
                    control.binding[controlName] = control.originalValue;
                }
                control.controller.refresh();
            }
        }
    }
} 