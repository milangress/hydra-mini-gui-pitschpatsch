// GUI management functionality
import { Parser } from 'acorn';

export class GUIManager {
    constructor(hydra) {
        this.hydra = hydra;
        this.gui = null;
        this.controls = new Map();
        this._observer = null;
        this.errorFolder = null;
        this.resetButton = null;
    }

    setupGUI() {
        console.log('setting up gui');
        
        // Clean up any existing GUI first
        this.cleanup();

        // Check for existing GUI in the DOM
        const existingGui = document.getElementById('hydra-mini-gui');
        if (existingGui) {
            console.log('Found existing GUI, removing it');
            existingGui.remove();
        }

        if (!window.lil?.GUI) {
            console.error('lil-gui not loaded');
            return;
        }

        // Create the GUI
        this.gui = new window.lil.GUI({ title: 'Hydra Controls' });
        
        // Add reset button at the top
        const resetObj = { reset: () => this.resetAllValues() };
        this.resetButton = this.gui.add(resetObj, 'reset').name('Reset All Values');
        
        // Add error folder (hidden by default)
        this.errorFolder = this.gui.addFolder('Errors');
        this.errorFolder.add({ message: 'No errors' }, 'message').disable();
        this.errorFolder.hide();
        
        // Style the GUI container to work with Hydra
        const container = this.gui.domElement;
        container.style.zIndex = '9999';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.right = '10px';
        container.classList.add('hydra-ui'); // Add Hydra's UI class
        container.setAttribute('id', 'hydra-mini-gui'); // Add specific ID

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

        // Force the GUI to be visible
        this.gui.show();
        this.gui._closed = false;
        container.style.display = '';

        // Add a placeholder until we have real controls
        this.gui.add({ message: 'Waiting for code...' }, 'message').disable();

        // Create a mutation observer to watch for DOM changes
        this._observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // If our GUI was removed, re-add it
                if ([...mutation.removedNodes].includes(container)) {
                    console.log('GUI was removed, re-adding');
                    const parent = container.parentElement || editorContainer || document.body;
                    // Only re-add if no other GUI exists
                    if (!document.getElementById('hydra-mini-gui')) {
                        parent.appendChild(container);
                        this.gui.show();
                        this.gui._closed = false;
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

        // Destroy existing GUI if it exists
        if (this.gui) {
            this.gui.destroy();
            this.gui = null;
        }

        // Clear controls map
        this.controls.clear();
        
        // Reset error folder reference
        this.errorFolder = null;
    }

    updateGUI(currentCode, valuePositions, onValueChange) {
        console.log('updating gui', !this.gui, 'current code:', currentCode);
        if (!this.gui) {
            this.setupGUI();
            return;
        }

        // Store the GUI's current state
        const wasOpen = this.gui._closed === false;
        const guiPosition = {
            left: this.gui.domElement.style.left,
            top: this.gui.domElement.style.top,
            right: this.gui.domElement.style.right
        };

        // Store the reset button reference before clearing
        const resetObj = { reset: () => this.resetAllValues() };
        
        // Clear ALL existing GUI elements (controllers and folders)
        this.gui.folders.slice().forEach(folder => {
            if (folder !== this.errorFolder) {
                folder.destroy();
            }
        });
        
        // Destroy all controllers
        while (this.gui.controllers.length) {
            this.gui.controllers[0].destroy();
        }
        
        // Re-add the reset button at the top
        this.resetButton = this.gui.add(resetObj, 'reset').name('Reset All Values');
        
        this.controls.clear();

        if (valuePositions.length === 0) {
            // Check if it's a syntax error
            try {
                if (currentCode) {
                    Parser.parse(currentCode, { ecmaVersion: 'latest' });
                    // If we get here, there's no syntax error
                    this.hideError();
                }
            } catch (error) {
                // Show syntax error in the error folder
                this.showError(error.message);
            }
            // Add a placeholder if no values found
            this.gui.add({ message: 'No controls available' }, 'message').disable();
        } else {
            // Hide error folder if we have valid values
            this.hideError();
            
            // Group values by their function and line number
            const functionGroups = new Map();
            const values = {};

            valuePositions.forEach((val, i) => {
                const name = `value${i}`;
                values[name] = val.value;

                // Create a unique ID for this function instance based on the function's start position
                // For method chains, all parameters of the same function call will have the same functionStartCh
                const functionId = `${val.functionName}_line${val.lineNumber}_pos${val.functionStartCh}`;

                // Add to the function group
                if (!functionGroups.has(functionId)) {
                    functionGroups.set(functionId, {
                        name: val.functionName,
                        line: val.lineNumber,
                        position: val.functionStartCh, // Use function start position for sorting
                        params: []
                    });
                }

                functionGroups.get(functionId).params.push({
                    value: val.value,
                    index: i,
                    paramName: val.paramName,
                    controlName: name,
                    paramCount: val.parameterIndex,
                    type: val.type,
                    options: val.options
                });
            });

            // Sort function groups by line number and then by position within the line
            const sortedGroups = Array.from(functionGroups.entries())
                .sort(([, a], [, b]) => {
                    if (a.line !== b.line) {
                        return a.line - b.line;
                    }
                    return a.position - b.position;
                });

            // Create folders for each function instance
            let instanceCounts = new Map();
            for (const [functionId, group] of sortedGroups) {
                // Create a display name with instance number if needed
                const count = instanceCounts.get(group.name) || 0;
                const displayName = count === 0 ? group.name : `${group.name} ${count + 1}`;
                instanceCounts.set(group.name, count + 1);

                const folder = this.gui.addFolder(displayName);

                // Sort parameters by their position in the function call
                group.params.sort((a, b) => a.paramCount - b.paramCount);

                group.params.forEach(param => {
                    let controller;
                    if (param.type === 'number') {
                        controller = folder.add(values, param.controlName)
                            .name(param.paramName)
                            .onChange((value) => {
                                onValueChange(param.index, value);
                            });

                        // Set min/max based on value magnitude
                        const magnitude = Math.abs(param.value);
                        if (magnitude > 0 && magnitude < 1) {
                            controller.min(0).max(1).step(0.01);
                        } else if (magnitude < 10) {
                            controller.min(-10).max(10).step(0.1);
                        } else {
                            controller.min(-100).max(100).step(1);
                        }
                    } else {
                        // For source/output parameters, create a dropdown
                        controller = folder.add(values, param.controlName, param.options)
                            .name(param.paramName)
                            .onChange((value) => {
                                onValueChange(param.index, value);
                            });
                    }

                    this.controls.set(param.controlName, { controller, originalValue: param.value });
                });
                
                // Open folders by default
                folder.open();
            }
        }

        // Force GUI to be visible
        this.gui.domElement.style.display = '';
        this.gui.domElement.style.visibility = 'visible';
        this.gui.domElement.style.opacity = '1';

        // Restore GUI state
        if (wasOpen) {
            this.gui.open();
            this.gui._closed = false;
        }

        // Restore position if it was moved
        if (guiPosition.left) this.gui.domElement.style.left = guiPosition.left;
        if (guiPosition.top) this.gui.domElement.style.top = guiPosition.top;
        if (guiPosition.right) this.gui.domElement.style.right = guiPosition.right;

        // Ensure the GUI is in a good position if not already positioned
        if (!guiPosition.left && !guiPosition.right) {
            this.gui.domElement.style.right = '10px';
            this.gui.domElement.style.top = '10px';
        }
    }

    showError(message) {
        if (!this.errorFolder) return;
        
        // Clear existing error messages
        while (this.errorFolder.controllers.length) {
            this.errorFolder.controllers[0].destroy();
        }
        
        // Add new error message
        const errorObj = { message };
        this.errorFolder.add(errorObj, 'message').disable();
        
        // Style the error folder
        this.errorFolder.show();
        this.errorFolder.open();
        
        // Style the error message
        const errorController = this.errorFolder.controllers[0];
        if (errorController && errorController.domElement) {
            const nameElement = errorController.domElement.querySelector('.name');
            const widget = errorController.domElement.querySelector('.widget');
            if (nameElement) nameElement.style.color = '#ff0000';
            if (widget) widget.style.color = '#ff0000';
        }
    }

    hideError() {
        if (this.errorFolder) {
            this.errorFolder.hide();
        }
    }

    revertValue(index, originalValue) {
        const controlName = `value${index}`;
        const control = this.controls.get(controlName);
        if (control?.controller) {
            try {
                // Use lil-gui's built-in reset functionality
                control.controller.reset();
            } catch (e) {
                // Fallback to manual reset if built-in reset fails
                control.controller.setValue(originalValue);
            }
        }
    }

    resetAllValues() {
        for (const [controlName, control] of this.controls) {
            if (control?.controller && control?.originalValue !== undefined) {
                try {
                    // Use lil-gui's built-in reset functionality
                    control.controller.reset();
                } catch (e) {
                    // Fallback to manual reset if built-in reset fails
                    const value = control.originalValue;
                    control.controller.setValue(value);
                }
            }
        }
    }
} 